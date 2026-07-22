CREATE TABLE monthly_devices_without_timestamp (
  period TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  PRIMARY KEY (period, device_hash)
) WITHOUT ROWID;

INSERT INTO monthly_devices_without_timestamp (period, device_hash)
SELECT period, device_hash FROM monthly_devices;

DROP TABLE monthly_devices;

ALTER TABLE monthly_devices_without_timestamp RENAME TO monthly_devices;
