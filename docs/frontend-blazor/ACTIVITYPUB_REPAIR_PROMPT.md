# ActivityPub機能修復プロンプト

## 障害概要

ActivityPub機能の検証基盤が壊れている。主因は次の4点。

1. `ActivityPubServer.slnx` が `frontend/ActivityPub.React/package.json` をProjectとして登録しており、ソリューションロードが `MSB4025: ProjectType '' not found` で失敗する。
2. `tests/ActivityPub.Api.Tests/packages.lock.json` が stale で、`NU1004`(Identity.EntityFrameworkCore 10.0.10 vs 10.0.11)によりlocked restoreが失敗する。
3. テスト出力ディレクトリに削除済み `ActivityPub.Misskey.Blazor*` の staticwebassets manifest が残留し、テスト起動時に `DirectoryNotFoundException` で153件失敗する。
4. ローカル環境の nuget.org 監査データ取得不可で `NU1900` によりrestoreが失���する(環境要因、CIでは通常動作)。

## 修正方針

- slnxからReact package.jsonのProject登録を削除する(Viteはslnx管理対象外)。
- lockファイルを `--force-evaluate` で再生成する。
- テストプロジェクトをクリーンビルドして残留manifestを除去する。
- 検証は `dotnet test` でActivityPub APIテスト全件をパスさせる。

## 完了条件

- `dotnet restore ActivityPubServer.slnx --locked-mode` 成功
- `dotnet build ActivityPubServer.slnx -c Release --no-restore` 成功
- `dotnet test ActivityPubServer.slnx -c Release --no-build` 成功
