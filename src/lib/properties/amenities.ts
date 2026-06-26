import { prisma } from "@/lib/db";
import {
  SERVER_CACHE_TTL,
  cachedQuery,
  catalogCacheKey,
  invalidateCatalogCache,
} from "@/lib/api/server-cache";
import { parseId, type IdInput } from "@/lib/ids";

const amenitySelect = {
  id: true,
  name: true,
  category: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listAmenities() {
  return cachedQuery(catalogCacheKey("amenities"), SERVER_CACHE_TTL.catalog, () =>
    prisma.amenity.findMany({
      select: amenitySelect,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  );
}

export async function getAmenity(id: IdInput) {
  const amenity = await prisma.amenity.findUnique({
    where: { id: parseId(id) },
    select: amenitySelect,
  });
  if (!amenity) throw new Error("NOT_FOUND");
  return amenity;
}

export async function createAmenity(data: {
  name: string;
  category: "INTERNET" | "PARKING" | "SECURITY";
}) {
  const existing = await prisma.amenity.findUnique({ where: { name: data.name } });
  if (existing) throw new Error("CONFLICT:Amenity with this name already exists");
  const amenity = await prisma.amenity.create({ data, select: amenitySelect });
  invalidateCatalogCache();
  return amenity;
}

export async function updateAmenity(
  id: IdInput,
  data: { name?: string; category?: "INTERNET" | "PARKING" | "SECURITY" },
) {
  const amenityId = parseId(id);
  await getAmenity(amenityId);
  if (data.name) {
    const conflict = await prisma.amenity.findFirst({
      where: { name: data.name, id: { not: amenityId } },
    });
    if (conflict) throw new Error("CONFLICT:Amenity with this name already exists");
  }
  const amenity = await prisma.amenity.update({
    where: { id: amenityId },
    data,
    select: amenitySelect,
  });
  invalidateCatalogCache();
  return amenity;
}

export async function deleteAmenity(id: IdInput) {
  await getAmenity(id);
  await prisma.amenity.delete({ where: { id: parseId(id) } });
  invalidateCatalogCache();
}
