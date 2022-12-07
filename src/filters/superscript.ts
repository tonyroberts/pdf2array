import {Row} from "../pdf2array";
import {KDTree} from "kdtree-ts";

export interface StripSuperscriptOptions {
    radiusScale?: number;  // distance to look from an item for the top corners of another item,
                           // as a fraction of the height of the item being inspected.
    heightScale?: number; // Only items smaller than the main text times this tolerance will be assumed to be
                          // superscript. Set to 1 if superscript is the same size as the main text.
    stripLeft?: boolean   // Strip superscripts that are to the left of the main text
    stripRight?: boolean   // Strip superscripts that are to the right of the main text
};

const DefaultOptions: StripSuperscriptOptions = {
    radiusScale: 0.50,
    heightScale: 0.75,
    stripLeft: true,
    stripRight: true
}


/**
 * Look for superscript bits of text and remove them.
 *
 * @param rows
 * @param options
 */
export function stripSuperscripts(rows: Row[], options?: StripSuperscriptOptions) {
    const radiusScale = options?.radiusScale ?? DefaultOptions.radiusScale;
    const heightScale = options?.heightScale ?? DefaultOptions.heightScale;
    const stripLeft = options?.stripLeft ?? DefaultOptions.stripLeft;
    const stripRight = options?.stripRight ?? DefaultOptions.stripRight;

    // If we're not striping left or right then there's nothing to do
    if (!stripLeft && !stripRight) {
        return rows;
    }

    // Split the rows into pages
    const pages: {page: number, rows: Row[]}[] =
        rows.reduce((prev, row) => {
            let current = prev[prev.length-1];
            if (row.page != current.page) {
                current = {page: row.page, rows: []}
                prev.push(current);
            }
            current.rows.push(row);
            return prev;
    }, [{page: 0, rows:[]}])

    // Map of row -> items of subscript items
    const superscripts = new Map<number, Set<Number>>();

    for (let page of pages) {
        // Build KD trees of the top corners of each text item on the page
        const items = page.rows.reduce((prev, row) => {
            return [
                ...prev,
                ...row.items.map((item, idx) => ({
                    page: row.page,
                    rowNumber: row.rowNumber,
                    itemNumber: idx,
                    ...item
                }))
            ]
        }, []);

        const topLeftTree = (() => {
            if (stripLeft) {
                const topLeftPoints = items.map((item) => [
                    item.x, item.y
                ]);
                return new KDTree(topLeftPoints, 2);
            }
        })();

        const topRightTree = (() => {
            if (stripRight) {
                const topRightPoints = items.map((item) => [
                    item.x + item.width, item.y
                ]);
                return new KDTree(topRightPoints, 2);
            }
        })();

        // For each item check if there are any other items where the top corner
        // is close to the middle left of the item.
        items.forEach((item, i) => {
            const leftPos = [item.x, item.y - item.height / 2];
            const rightPos = [item.x + item.width, item.y - item.height / 2];

            const topLeftMatches = topLeftTree?.radiusSearch(
                    rightPos,
                    item.height * radiusScale)
                ?.filter((idx) => idx !== i)
                ?.filter((idx) => items[idx].x > item.x)
                ?.filter((idx) => (items[idx].height * heightScale) > item.height)
                ?? [];

            const topRightMatches = topRightTree?.radiusSearch(
                leftPos,
                item.height * radiusScale)
                ?.filter((idx) => idx !== i)
                ?.filter((idx) => items[idx].x < item.x)
                ?.filter((idx) => (items[idx].height * heightScale) > item.height)
                ?? [];

            if (topLeftMatches.length === 1 || topRightMatches.length === 1) {
                const ssitems = (() => {
                    let set = superscripts.get(item.rowNumber);
                    if (set === undefined) {
                        set = new Set();
                        superscripts.set(item.rowNumber, set);
                    }
                    return set;
                })();
                ssitems.add(item.itemNumber)
            }
        });
    }

    // Remove any superscript items found
    if (superscripts.size > 0) {
        return rows
            .map((row) => {
                const ssitems = superscripts.get(row.rowNumber);
                if (ssitems !== undefined) {
                    const newItems = row.items.filter((item, idx) => !ssitems.has(idx));
                    if (newItems.length === 0) {
                        return undefined;
                    }

                    return {
                        ...row,
                        xs: row.xs.filter((item, idx) => ssitems.has(idx)),
                        items: newItems
                    };
                }
                return row;
            })
            .filter((row) => row !== undefined)
            .map((row, idx) => ({
                ...row,
                rowNumber: idx
            }));
    }

    return rows;
}
