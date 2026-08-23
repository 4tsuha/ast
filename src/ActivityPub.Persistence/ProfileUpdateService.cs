using System.Text.Encodings.Web;
using ActivityPub.Application;
using ActivityPub.Domain;
using Microsoft.EntityFrameworkCore;

namespace ActivityPub.Persistence;

public sealed class ProfileUpdateService(
    IDbContextFactory<FederationDbContext> contextFactory) : IProfileUpdateService
{
    public async Task<bool> UpdateAsync(
        string username,
        ProfileUpdateCommand command,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        string normalized = username.ToUpperInvariant();
        await using FederationDbContext db = await contextFactory.CreateDbContextAsync(cancellationToken).ConfigureAwait(false);
        LocalActor? actor = await db.LocalActors.AsTracking()
            .SingleOrDefaultAsync(candidate => candidate.NormalizedUsername == normalized && !candidate.IsSuspended, cancellationToken)
            .ConfigureAwait(false);
        if (actor is null)
        {
            return false;
        }

        string displayName = command.Name ?? actor.DisplayName;
        string summaryHtml = command.Description is null ? actor.SummaryHtml : EncodeSummary(command.Description);
        actor.UpdateProfile(
            displayName,
            summaryHtml,
            command.IsLocked ?? actor.ManuallyApprovesFollowers,
            command.Discoverable ?? actor.Discoverable,
            command.Indexable ?? actor.Indexable,
            DateTimeOffset.UtcNow);

        if (command.AvatarId is not null)
        {
            var avatarMedia = await db.Set<MediaResource>().AsNoTracking()
                .SingleOrDefaultAsync(m => m.Id == command.AvatarId.Value, cancellationToken).ConfigureAwait(false);
            if (avatarMedia is null) throw new DomainException("Avatar media not found.");
            actor.SetAvatar(command.AvatarId, DateTimeOffset.UtcNow);
        }
        if (command.BannerId is not null)
        {
            var bannerMedia = await db.Set<MediaResource>().AsNoTracking()
                .SingleOrDefaultAsync(m => m.Id == command.BannerId.Value, cancellationToken).ConfigureAwait(false);
            if (bannerMedia is null) throw new DomainException("Banner media not found.");
            actor.SetBanner(command.BannerId, DateTimeOffset.UtcNow);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    private static string EncodeSummary(string description)
    {
        string normalized = description.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
        string encoded = HtmlEncoder.Default.Encode(normalized);
        return "<p>" + encoded.Replace("\n", "<br>", StringComparison.Ordinal) + "</p>";
    }
}
