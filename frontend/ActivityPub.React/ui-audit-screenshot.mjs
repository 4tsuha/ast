import { chromium } from "@playwright/test";

const BASE = "http://localhost:5173";
const notes = [
  { id: "n1", text: "hello world! This is a moderately long note to see wrapping behavior in the timeline #ActivityPub", createdAt: "2026-08-23T08:00:00.000Z", user: { username: "naya1115", name: "Naya", avatarUrl: "" }, reactions: { "❤️": 3 }, renoteCount: 2, repliesCount: 1 },
  { id: "n2", text: "content warning test note", cw: "CW: spoiler", createdAt: "2026-08-23T07:00:00.000Z", user: { username: "haganejp", name: "てすと", avatarUrl: "" }, reactions: { "👍": 5 }, renoteCount: 0, repliesCount: 0 },
  { id: "n3", text: "https://example.com/very/long/url/that/should/wrap/and/not/overflow/layout/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", createdAt: "2026-08-23T06:00:00.000Z", user: { username: "remote_user", name: "Remote User", host: "remote.example", avatarUrl: "" }, reactions: {}, renoteCount: 1, repliesCount: 2 },
];
const sessionBody = { authenticated: true, viewer: { username: "naya1115", actorIri: "https://testtest.exekey.net/users/naya1115", roles: [] }, csrf: { headerName: "X-CSRF-Token", requestToken: "test" } };

async function mockAll(page, { authed = true } = {}) {
  await page.route("**/api/frontend/session", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(authed ? sessionBody : { authenticated: false, csrf: { headerName: "X-CSRF-Token", requestToken: "tok" } }) }));
  await page.route("**/api/notes/timeline", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(notes) }));
  await page.route("**/api/notes/local-timeline", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(notes) }));
  await page.route("**/api/notes/global-timeline", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(notes) }));
  await page.route("**/api/i", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "me", username: "naya1115" }) }));
  await page.route("**/api/users/show", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "me", username: "naya1115", name: "Naya", description: "Hello alien world" }) }));
  await page.route("**/api/users/relation", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }));
  await page.route("**/api/users/notes", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(notes) }));
  await page.route("**/api/notifications", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "nf1", type: "follow", createdAt: "2026-08-23T05:00:00.000Z", isRead: false, user: { username: "alice", name: "Alice" } }, { id: "nf2", type: "reaction", createdAt: "2026-08-23T04:00:00.000Z", isRead: true, user: { username: "bob", name: "Bob" } }]) }));
  await page.route("**/api/users/search*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "u1", username: "alice", name: "Alice", avatarUrl: "" }]) }));
  await page.route("**/api/hashtags/search*", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ tag: "ActivityPub", usersCount: 3 }]) }));
  await page.route("**/api/notes/create", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ createdNote: { id: "new1" } }) }));
  await page.route("**/api/emojis", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ emojis: [{ name: "party", url: "https://remote.example/party.png" }, { name: "alien", url: "" }] }) }));
}

const shots = [
  { name: "home-desktop", path: "/", authed: true, vp: { width: 1280, height: 800 } },
  { name: "home-mobile", path: "/", authed: true, vp: { width: 375, height: 812 } },
  { name: "home-tablet", path: "/", authed: true, vp: { width: 768, height: 1024 } },
  { name: "signin-desktop", path: "/", authed: false, vp: { width: 1280, height: 800 } },
  { name: "signin-mobile", path: "/", authed: false, vp: { width: 375, height: 812 } },
  { name: "guest-desktop", path: "/guest", authed: false, vp: { width: 1280, height: 800 } },
  { name: "guest-mobile", path: "/guest", authed: false, vp: { width: 375, height: 812 } },
  { name: "profile-desktop", path: "/profile", authed: true, vp: { width: 1280, height: 800 } },
  { name: "profile-mobile", path: "/profile", authed: true, vp: { width: 375, height: 812 } },
  { name: "notifications-desktop", path: "/notifications", authed: true, vp: { width: 1280, height: 800 } },
  { name: "notifications-mobile", path: "/notifications", authed: true, vp: { width: 375, height: 812 } },
  { name: "search-desktop", path: "/search?q=test", authed: true, vp: { width: 1280, height: 800 } },
  { name: "search-mobile", path: "/search", authed: true, vp: { width: 375, height: 812 } },
  { name: "notfound", path: "/does-not-exist", authed: true, vp: { width: 1280, height: 800 } },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const s of shots) {
  await page.setViewportSize(s.vp);
  await mockAll(page, { authed: s.authed });
  await page.goto(BASE + s.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/root/new-project/test-results/ui-shots/${s.name}.png`, fullPage: false });
  console.log("shot", s.name);
}
// dark mode variant
await page.setViewportSize({ width: 1280, height: 800 });
await mockAll(page, { authed: true });
await page.emulateMedia({ colorScheme: "dark" });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/root/new-project/test-results/ui-shots/home-dark.png" });
console.log("shot home-dark");
await browser.close();
