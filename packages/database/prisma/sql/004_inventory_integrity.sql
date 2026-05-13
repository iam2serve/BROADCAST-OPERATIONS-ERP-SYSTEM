CREATE INDEX IF NOT EXISTS device_asset_lookup_idx
ON "BroadcastDevice" ("organizationId", "assetTag", "qrCodeIdentifier")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS sim_asset_lookup_idx
ON "SimCard" ("organizationId", "assetTag", "qrCodeIdentifier")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS router_asset_lookup_idx
ON "Router" ("organizationId", "assetTag", "qrCodeIdentifier")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS telemetry_asset_recent_idx
ON "AssetTelemetryMetric" ("organizationId", "assetType", "assetId", "measuredAt" DESC);

CREATE INDEX IF NOT EXISTS ownership_open_asset_idx
ON "AssetOwnershipHistory" ("organizationId", "assetType", "assetId")
WHERE "returnedAt" IS NULL;
