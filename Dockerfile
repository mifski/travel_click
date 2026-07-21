# TravelClick extraction backend — ASP.NET Core 8 + yt-dlp + ffmpeg
# Build:  docker build -t travelclick-backend .
# Run:    docker run -p 8080:8080 -e ANTHROPIC_API_KEY=sk-... -e BACKEND_API_KEY=<shared-secret> \
#                    -v travelclick-data:/data -e DB_PATH=/data/places.db travelclick-backend

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY TravelClick.csproj .
RUN dotnet restore TravelClick.csproj
COPY . .
RUN dotnet publish TravelClick.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENV DB_PATH=/data/places.db
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["dotnet", "TravelClick.dll"]
