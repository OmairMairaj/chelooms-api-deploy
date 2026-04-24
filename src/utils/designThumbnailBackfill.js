const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Any URL that starts with http(s):// or is a /uploads/<filename>.<ext> path is considered
// safe to render in the browser. Anything else (e.g. a Cloudinary public_id accidentally
// wrapped as "/uploads/abc") is treated as stale and will be replaced with a fresher value.
const isUsableImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return /^\/uploads\/.+\.[a-z0-9]+$/i.test(trimmed);
};

/**
 * Enrich a list of OrderItem records with the freshest `designThumbnailUrl` and `designName`
 * by reading SavedDesign rows for every design_bundle line. Does not mutate DB — returns a
 * new array with patched `attributes` objects.
 *
 * This self-heals items that were added to cart when the API was storing bogus local
 * filesystem paths as thumbnailUrl (pre-Cloudinary fix), and keeps production carts
 * consistent with the Cloudinary URL currently held by the SavedDesign row.
 */
async function backfillDesignThumbnails(items) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const designIds = Array.from(
    new Set(
      items
        .filter((it) => it && it.itemType === 'design_bundle' && it.designId)
        .map((it) => it.designId)
    )
  );
  if (designIds.length === 0) return items;

  const designs = await prisma.savedDesign.findMany({
    where: { saveDesignId: { in: designIds } },
    select: { saveDesignId: true, thumbnailUrl: true, designName: true },
  });
  const byId = new Map(designs.map((d) => [d.saveDesignId, d]));

  return items.map((it) => {
    if (!it || it.itemType !== 'design_bundle' || !it.designId) return it;
    const design = byId.get(it.designId);
    if (!design) return it;

    const currentAttr = (it.attributes && typeof it.attributes === 'object') ? it.attributes : {};
    const currentUrl = currentAttr.designThumbnailUrl;
    const freshUrl = design.thumbnailUrl;

    let finalUrl = null;
    if (isUsableImageUrl(freshUrl)) finalUrl = freshUrl;
    else if (isUsableImageUrl(currentUrl)) finalUrl = currentUrl;

    return {
      ...it,
      attributes: {
        ...currentAttr,
        designThumbnailUrl: finalUrl,
        designName: currentAttr.designName || design.designName || null,
      },
    };
  });
}

module.exports = {
  backfillDesignThumbnails,
  isUsableImageUrl,
};
