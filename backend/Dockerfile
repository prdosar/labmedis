FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY LabMedis.slnx ./
COPY src/LabMedis.Domain/LabMedis.Domain.csproj src/LabMedis.Domain/
COPY src/LabMedis.Application/LabMedis.Application.csproj src/LabMedis.Application/
COPY src/LabMedis.Infrastructure/LabMedis.Infrastructure.csproj src/LabMedis.Infrastructure/
COPY src/LabMedis.Api/LabMedis.Api.csproj src/LabMedis.Api/

RUN dotnet restore src/LabMedis.Api/LabMedis.Api.csproj

COPY src/ src/

RUN dotnet publish src/LabMedis.Api/LabMedis.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "LabMedis.Api.dll"]
