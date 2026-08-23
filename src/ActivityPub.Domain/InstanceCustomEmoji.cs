namespace ActivityPub.Domain;

public sealed class InstanceCustomEmoji : Entity
{
    private InstanceCustomEmoji() {}

    private InstanceCustomEmoji(Guid id, string shortcode, string name, string? category, string? host, string url, DateTimeOffset now) : base(id)
    {
        Shortcode = NormalizeShortcode(shortcode);
        Name = DomainText.Required(name, nameof(name), 68);
        Category = DomainText.Optional(category, nameof(category), 64);
        Host = DomainText.Optional(host, nameof(host), 255);
        Url = CanonicalIri.RequireAbsoluteHttp(url, nameof(url));
        CreatedAt = now;
        UpdatedAt = now;
    }

    public string Shortcode { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? Category { get; private set; }
    public string? Host { get; private set; }
    public string Url { get; private set; } = string.Empty;
    public string? StaticUrl { get; private set; }
    public bool VisibleInPicker { get; private set; } = true;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public long Version { get; private set; }

    public static InstanceCustomEmoji Create(string shortcode, string name, string? category, string? host, string url, DateTimeOffset now) =>
        new(Guid.NewGuid(), shortcode, name, category, host, url, now);

    public void Update(string name, string? category, string url, bool visibleInPicker, DateTimeOffset now)
    {
        Name = DomainText.Required(name, nameof(name), 68);
        Category = DomainText.Optional(category, nameof(category), 64);
        Url = CanonicalIri.RequireAbsoluteHttp(url, nameof(url));
        VisibleInPicker = visibleInPicker;
        UpdatedAt = now;
        Version++;
    }

    private static string NormalizeShortcode(string shortcode)
    {
        string normalized = DomainText.Required(shortcode, nameof(shortcode), 64).ToLowerInvariant();
        if (normalized.Any(c => !char.IsLetterOrDigit(c) && c != '_' && c != '-')) throw new DomainException("Shortcode must be alphanumeric, underscore or hyphen.");
        return normalized;
    }
}
