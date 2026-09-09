# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:10.0.302-noble@sha256:72dd743782f2ae7e5476fd64f6a460045e3998dc862218b80e6944cba79a01b0 AS build
WORKDIR /source
COPY .editorconfig Directory.Build.props Directory.Packages.props global.json LICENSE NOTICE.md ./
COPY src/ ./src/
COPY frontend/misskey-v12/public/static-assets/ ./frontend/misskey-v12/public/static-assets/
COPY frontend/misskey-v12/public/client-assets/ ./frontend/misskey-v12/public/client-assets/
RUN dotnet restore src/ActivityPub.Api/ActivityPub.Api.csproj --locked-mode \
    && dotnet publish src/ActivityPub.Api/ActivityPub.Api.csproj \
       --configuration Release \
       --no-restore \
       --output /out \
       --property:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.12-noble@sha256:3a494b8a73ec3248c237c9438592ff1e04587edf65863212bc1027e54dcb6f36 AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=$APP_UID:$APP_UID /out/ ./
COPY --from=build --chown=$APP_UID:$APP_UID /source/LICENSE /source/NOTICE.md ./
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    HOME=/tmp
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "ActivityPub.Server.dll"]
