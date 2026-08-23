namespace ActivityPub.Application;

public sealed record CustomEmojiView(
    Guid Id,
    string Shortcode,
    string Name,
    string? Category,
    string? Host,
    string Url,
    string? StaticUrl,
    bool VisibleInPicker,
    DateTimeOffset CreatedAt
);

public sealed record CreateCustomEmojiCommand(
    string Shortcode,
    string Name,
    string? Category,
    string? Host,
    string Url
);

public sealed record UpdateCustomEmojiCommand(
    string Name,
    string? Category,
    string Url,
    bool VisibleInPicker
);

public interface IInstanceCustomEmojiService
{
    Task<IReadOnlyList<CustomEmojiView>> ListAsync(string? host, string? category, CancellationToken cancellationToken);
    Task<CustomEmojiView?> FindAsync(string shortcode, CancellationToken cancellationToken);
    Task<CustomEmojiView> CreateAsync(CreateCustomEmojiCommand command, CancellationToken cancellationToken);
    Task<CustomEmojiView?> UpdateAsync(string shortcode, UpdateCustomEmojiCommand command, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string shortcode, CancellationToken cancellationToken);
}
