UPDATE "Amenity" SET "showInSearch" = true;
SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "showInSearch") AS in_search FROM "Amenity";
