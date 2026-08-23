using System.Net;
using System.Text;
using ActivityPub.Application;
using ActivityPub.Domain;
using ActivityPub.Federation.Http;
using ActivityPub.Federation.Outbound;

namespace ActivityPub.Federation.Tests;

public sealed class RemoteAccountResolverTests
{
    [Fact]
    public async Task ResolvesWebFingerSelfThroughTheSafeFederationBoundary()
    {
        const string actorIri = "https://remote.example/users/42";
        var http = new RecordingHttpClient(Response(
            "{\"subject\":\"acct:Alice@remote.example\",\"links\":[" +
            "{\"rel\":\"http://webfinger.net/rel/profile-page\",\"href\":\"https://remote.example/@Alice\"}," +
            "{\"rel\":\"self\",\"type\":\"application/activity+json\",\"href\":\"" + actorIri + "\"}]}"));
        var recipients = new RecordingRecipientResolver(new(
            actorIri,
            actorIri + "/inbox",
            "https://remote.example/inbox"));
        var resolver = new RemoteAccountResolver(http, recipients, Options());

        string result = await resolver.ResolveAsync("Alice", "remote.example", CancellationToken.None);

        Assert.Equal(actorIri, result);
        Assert.NotNull(http.Request);
        Assert.Equal(Uri.UriSchemeHttps, http.Request.Uri.Scheme);
        Assert.Equal("remote.example", http.Request.Uri.IdnHost);
        Assert.Equal("/.well-known/webfinger", http.Request.Uri.AbsolutePath);
        Assert.Equal("?resource=acct%3AAlice%40remote.example", http.Request.Uri.Query);
        Assert.Contains("application/jrd+json", http.Request.AcceptedMediaTypes);
        Assert.Equal(256 * 1024, http.Request.MaximumResponseBytes);
        Assert.Equal(actorIri, recipients.ActorIri);
    }

    [Fact]
    public async Task RejectsAMismatchedWebFingerSubjectBeforeFetchingAnActor()
    {
        var http = new RecordingHttpClient(Response(
            "{\"subject\":\"acct:mallory@remote.example\",\"links\":[" +
            "{\"rel\":\"self\",\"href\":\"https://remote.example/users/mallory\"}]}"));
        var recipients = new RecordingRecipientResolver(new(
            "https://remote.example/users/mallory",
            "https://remote.example/users/mallory/inbox",
            null));
        var resolver = new RemoteAccountResolver(http, recipients, Options());

        await Assert.ThrowsAsync<RemoteAccountResolutionException>(() =>
            resolver.ResolveAsync("alice", "remote.example", CancellationToken.None));

        Assert.Null(recipients.ActorIri);
    }

    [Theory]
    [InlineData("alice@example", "remote.example")]
    [InlineData("alice", "https://remote.example/path")]
    [InlineData("alice", "remote.example/#fragment")]
    public async Task RejectsInvalidAccountInputWithoutNetworkAccess(string username, string host)
    {
        var http = new RecordingHttpClient(Response("{}"));
        var resolver = new RemoteAccountResolver(
            http,
            new RecordingRecipientResolver(new("https://remote.example/users/alice", "https://remote.example/inbox", null)),
            Options());

        await Assert.ThrowsAsync<RemoteAccountResolutionException>(() =>
            resolver.ResolveAsync(username, host, CancellationToken.None));

        Assert.Null(http.Request);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ReportsSafeHttpPolicyRejectionsAsRemoteResolutionFailures(bool unsafeTarget)
    {
        Exception rejected = unsafeTarget
            ? new UnsafeFederationTargetException("test target rejected")
            : new FederationTargetPolicyException();
        var resolver = new RemoteAccountResolver(
            new ThrowingHttpClient(rejected),
            new RecordingRecipientResolver(new("https://remote.example/users/alice", "https://remote.example/inbox", null)),
            Options());

        RemoteAccountResolutionException failure = await Assert.ThrowsAsync<RemoteAccountResolutionException>(() =>
            resolver.ResolveAsync("alice", "remote.example", CancellationToken.None));

        Assert.Same(rejected, failure.InnerException);
    }

    private static FederationOptions Options() => new()
    {
        PublicBaseUri = new Uri("https://local.example"),
        MaximumRemoteDocumentBytes = 2_000_000
    };

    private static SafeFederationResponse Response(string json) => new(
        HttpStatusCode.OK,
        new Uri("https://remote.example/.well-known/webfinger"),
        "application/jrd+json",
        Encoding.UTF8.GetBytes(json),
        null,
        null,
        null);

    private sealed class RecordingHttpClient(SafeFederationResponse response) : ISafeFederationHttpClient
    {
        public SafeFederationRequest? Request { get; private set; }

        public Task<SafeFederationResponse> SendAsync(
            SafeFederationRequest request,
            CancellationToken cancellationToken)
        {
            Request = request;
            return Task.FromResult(response);
        }
    }

    private sealed class ThrowingHttpClient(Exception exception) : ISafeFederationHttpClient
    {
        public Task<SafeFederationResponse> SendAsync(
            SafeFederationRequest request,
            CancellationToken cancellationToken) =>
            Task.FromException<SafeFederationResponse>(exception);
    }

    private sealed class RecordingRecipientResolver(RemoteActorEndpoint endpoint) : IRemoteRecipientResolver
    {
        public string? ActorIri { get; private set; }

        public Task<IReadOnlyList<RemoteActorEndpoint>> ResolveAsync(
            string localActorIri,
            IReadOnlyList<AudienceAddress> audience,
            CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<RemoteActorEndpoint>>([]);

        public Task<RemoteActorEndpoint> RediscoverAsync(
            string actorIri,
            CancellationToken cancellationToken)
        {
            ActorIri = actorIri;
            return Task.FromResult(endpoint);
        }
    }
}
