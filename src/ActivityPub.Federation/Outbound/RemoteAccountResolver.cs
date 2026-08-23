using System.Globalization;
using System.Net;
using System.Text.Json;
using ActivityPub.Application;
using ActivityPub.Federation.Http;

namespace ActivityPub.Federation.Outbound;

public sealed class RemoteAccountResolver(
    ISafeFederationHttpClient httpClient,
    IRemoteRecipientResolver recipients,
    FederationOptions options) : IRemoteAccountResolver
{
    private const int MaximumWebFingerBytes = 256 * 1024;

    private static readonly IReadOnlySet<string> AcceptedMediaTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "application/jrd+json",
        "application/json"
    };

    public async Task<string> ResolveAsync(
        string username,
        string host,
        CancellationToken cancellationToken)
    {
        string normalizedUsername = NormalizeUsername(username);
        Uri origin = NormalizeOrigin(host);
        if (SameOrigin(origin, options.PublicBaseUri))
        {
            throw new RemoteAccountResolutionException("A remote account resolver cannot resolve a local account.");
        }

        string resource = $"acct:{normalizedUsername}@{origin.Authority}";
        var request = new SafeFederationRequest(
            HttpMethod.Get,
            new Uri(origin, "/.well-known/webfinger?resource=" + Uri.EscapeDataString(resource)),
            null,
            null,
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase),
            AcceptedMediaTypes,
            Math.Min(MaximumWebFingerBytes, options.MaximumRemoteDocumentBytes));

        try
        {
            SafeFederationResponse response = await httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
            if (response.StatusCode != HttpStatusCode.OK)
            {
                throw new RemoteAccountResolutionException("Remote WebFinger discovery did not return a successful response.");
            }

            using JsonDocument document = JsonDocument.Parse(
                response.Body,
                new JsonDocumentOptions { MaxDepth = 32 });
            JsonElement root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                throw new RemoteAccountResolutionException("Remote WebFinger discovery returned an invalid document.");
            }

            if (root.TryGetProperty("subject", out JsonElement subject) &&
                (subject.ValueKind != JsonValueKind.String ||
                 !string.Equals(subject.GetString(), resource, StringComparison.OrdinalIgnoreCase)))
            {
                throw new RemoteAccountResolutionException("Remote WebFinger subject does not match the requested account.");
            }

            string actorIri = ReadActorIri(root);
            RemoteActorEndpoint endpoint = await recipients.RediscoverAsync(actorIri, cancellationToken).ConfigureAwait(false);
            if (!string.Equals(endpoint.ActorIri, actorIri, StringComparison.Ordinal))
            {
                throw new RemoteAccountResolutionException("Resolved actor identity does not match its ActivityStreams document.");
            }

            return actorIri;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (RemoteAccountResolutionException)
        {
            throw;
        }
        catch (Exception exception) when (exception is
            HttpRequestException or
            JsonException or
            InvalidOperationException or
            UnsafeFederationTargetException or
            FederationTargetPolicyException)
        {
            throw new RemoteAccountResolutionException("Remote account discovery failed.", exception);
        }
    }

    private static string NormalizeUsername(string username)
    {
        string value = username.Trim().TrimStart('@');
        if (value.Length is < 1 or > 128 ||
            value.Any(character => char.IsControl(character) || char.IsWhiteSpace(character)) ||
            value.IndexOfAny(['@', '/', '\\', '?', '#']) >= 0)
        {
            throw new RemoteAccountResolutionException("Remote account username is invalid.");
        }

        return value;
    }

    private static Uri NormalizeOrigin(string host)
    {
        string value = host.Trim().TrimEnd('.');
        if (value.Length is < 1 or > 255 ||
            value.Any(character => char.IsControl(character) || char.IsWhiteSpace(character)) ||
            !Uri.TryCreate("https://" + value, UriKind.Absolute, out Uri? origin) ||
            origin.UserInfo.Length != 0 || origin.AbsolutePath != "/" ||
            origin.Query.Length != 0 || origin.Fragment.Length != 0)
        {
            throw new RemoteAccountResolutionException("Remote account host is invalid.");
        }

        try
        {
            string asciiHost = new IdnMapping().GetAscii(origin.IdnHost);
            return new UriBuilder(Uri.UriSchemeHttps, asciiHost, origin.IsDefaultPort ? -1 : origin.Port).Uri;
        }
        catch (ArgumentException exception)
        {
            throw new RemoteAccountResolutionException("Remote account host is invalid.", exception);
        }
    }

    private static string ReadActorIri(JsonElement root)
    {
        if (!root.TryGetProperty("links", out JsonElement links) || links.ValueKind != JsonValueKind.Array)
        {
            throw new RemoteAccountResolutionException("Remote WebFinger document has no links.");
        }

        foreach (JsonElement link in links.EnumerateArray())
        {
            if (link.ValueKind != JsonValueKind.Object ||
                !link.TryGetProperty("rel", out JsonElement rel) || rel.ValueKind != JsonValueKind.String ||
                !string.Equals(rel.GetString(), "self", StringComparison.OrdinalIgnoreCase) ||
                !link.TryGetProperty("href", out JsonElement href) || href.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            string? value = href.GetString();
            if (value is not null && Uri.TryCreate(value, UriKind.Absolute, out Uri? actor) &&
                actor.UserInfo.Length == 0 &&
                (string.Equals(actor.Scheme, Uri.UriSchemeHttps, StringComparison.Ordinal) ||
                 string.Equals(actor.Scheme, Uri.UriSchemeHttp, StringComparison.Ordinal)))
            {
                return actor.AbsoluteUri;
            }
        }

        throw new RemoteAccountResolutionException("Remote WebFinger document has no ActivityStreams self link.");
    }

    private static bool SameOrigin(Uri first, Uri second) =>
        string.Equals(first.Scheme, second.Scheme, StringComparison.OrdinalIgnoreCase) &&
        string.Equals(first.IdnHost, second.IdnHost, StringComparison.OrdinalIgnoreCase) &&
        first.Port == second.Port;
}
