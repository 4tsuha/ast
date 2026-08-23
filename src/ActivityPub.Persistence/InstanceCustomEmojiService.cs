using ActivityPub.Application;
using ActivityPub.Domain;
using Microsoft.EntityFrameworkCore;

namespace ActivityPub.Persistence;

public sealed class InstanceCustomEmojiService(IDbContextFactory<FederationDbContext> contextFactory) : IInstanceCustomEmojiService
{
    public async Task<IReadOnlyList<CustomEmojiView>> ListAsync(string? host, string? category, CancellationToken cancellationToken)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken).ConfigureAwait(false);
        var q = db.InstanceCustomEmojis.AsNoTracking().AsQueryable();
        if (host is not null) q = q.Where(x => x.Host == host);
        if (category is not null) q = q.Where(x => x.Category == category);
        var list = await q.OrderBy(x => x.Shortcode).ToListAsync(cancellationToken).ConfigureAwait(false);
        return list.Select(Map).ToList();
    }

    public async Task<CustomEmojiView?> FindAsync(string shortcode, CancellationToken cancellationToken)
    {
        string norm = shortcode.ToLowerInvariant();
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken).ConfigureAwait(false);
        var e = await db.InstanceCustomEmojis.AsNoTracking().SingleOrDefaultAsync(x => x.Shortcode == norm, cancellationToken).ConfigureAwait(false);
        return e is null ? null : Map(e);
    }

    public async Task<CustomEmojiView> CreateAsync(CreateCustomEmojiCommand command, CancellationToken cancellationToken)
    {
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken).ConfigureAwait(false);
        string norm = command.Shortcode.ToLowerInvariant();
        if (await db.InstanceCustomEmojis.AnyAsync(x => x.Shortcode == norm, cancellationToken).ConfigureAwait(false))
            throw new DomainException("Shortcode already exists.");
        var emoji = InstanceCustomEmoji.Create(norm, command.Name, command.Category, command.Host, command.Url, DateTimeOffset.UtcNow);
        db.InstanceCustomEmojis.Add(emoji);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return Map(emoji);
    }

    public async Task<CustomEmojiView?> UpdateAsync(string shortcode, UpdateCustomEmojiCommand command, CancellationToken cancellationToken)
    {
        string norm = shortcode.ToLowerInvariant();
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken).ConfigureAwait(false);
        var e = await db.InstanceCustomEmojis.SingleOrDefaultAsync(x => x.Shortcode == norm, cancellationToken).ConfigureAwait(false);
        if (e is null) return null;
        e.Update(command.Name, command.Category, command.Url, command.VisibleInPicker, DateTimeOffset.UtcNow);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return Map(e);
    }

    public async Task<bool> DeleteAsync(string shortcode, CancellationToken cancellationToken)
    {
        string norm = shortcode.ToLowerInvariant();
        await using var db = await contextFactory.CreateDbContextAsync(cancellationToken).ConfigureAwait(false);
        var e = await db.InstanceCustomEmojis.SingleOrDefaultAsync(x => x.Shortcode == norm, cancellationToken).ConfigureAwait(false);
        if (e is null) return false;
        db.InstanceCustomEmojis.Remove(e);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    private static CustomEmojiView Map(InstanceCustomEmoji e) => new(e.Id, e.Shortcode, e.Name, e.Category, e.Host, e.Url, e.StaticUrl, e.VisibleInPicker, e.CreatedAt);
}
