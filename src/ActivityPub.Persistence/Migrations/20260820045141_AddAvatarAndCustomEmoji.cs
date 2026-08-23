using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ActivityPub.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAvatarAndCustomEmoji : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "avatar_media_id",
                schema: "activitypub",
                table: "local_actors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "banner_media_id",
                schema: "activitypub",
                table: "local_actors",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "instance_custom_emojis",
                schema: "activitypub",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shortcode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(68)", maxLength: 68, nullable: false),
                    category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    host = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    static_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    visible_in_picker = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_instance_custom_emojis", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_instance_custom_emojis_host",
                schema: "activitypub",
                table: "instance_custom_emojis",
                column: "host");

            migrationBuilder.CreateIndex(
                name: "ux_instance_custom_emojis_shortcode",
                schema: "activitypub",
                table: "instance_custom_emojis",
                column: "shortcode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "instance_custom_emojis",
                schema: "activitypub");

            migrationBuilder.DropColumn(
                name: "avatar_media_id",
                schema: "activitypub",
                table: "local_actors");

            migrationBuilder.DropColumn(
                name: "banner_media_id",
                schema: "activitypub",
                table: "local_actors");
        }
    }
}
