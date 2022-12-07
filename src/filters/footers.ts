import {Row} from "../pdf2array";

export interface StripFootersOptions {
    yTolerance?: number;
    xTolerance?: number;
    confidence?: number;
};

const DefaultFooterOptions: StripFootersOptions = {
    yTolerance: 1,
    xTolerance: 1,
    confidence: 0.5
}

/**
 * Determine if two footer rows should be considered equivalent or not.
 */
function _cmpFooters(a: Row, b: Row, options?: StripFootersOptions) {
    // If the number of items is different then they're not the same footer
    if (a.items.length !== b.items.length) {
        return false;
    }

    // If the y-coords are not similar then they're not both footers
    const yTolerance = options?.yTolerance ?? DefaultFooterOptions.yTolerance;
    if (Math.abs(a.y - b.y) > yTolerance) {
        return false;
    }

    const xTolerance = options?.xTolerance ?? DefaultFooterOptions.xTolerance;
    for (let i = 0; i < a.items.length; ++i) {
        const aItem = a.items[i];
        const bItem = b.items[i];

        // If the x-coords are not similar (either the start, end or center since they could be left,
        // right or center justified) then they're not both footers.
        if (Math.abs(aItem.x - bItem.x) > xTolerance &&
            Math.abs((aItem.x + aItem.width) - (bItem.x + bItem.width)) > xTolerance &&
            Math.abs((aItem.x + aItem.width / 2) - (bItem.x + bItem.width / 2)) > xTolerance) {
            return false;
        }

        // If the text of any of the items is different (other than numbers, which could be different
        // because of the page number) then they're not both footers.
        if (aItem.str.replaceAll(/\d+/g, '').trim().toLowerCase() !==
            bItem.str.replaceAll(/\d+/g, '').trim().toLowerCase()) {
            return false;
        }
    }

    // If everything matches then they could both be a footer.
    return true;
}


/**
 * Look for similar last rows across the pages in a document and return the rows
 * with any footer rows removed.
 *
 * @param rows
 * @param options
 */
export function stripFooters(rows: Row[], options?: StripFootersOptions) {
    // Get the last row in each page
    const footers = rows.reduce((prev, row) => {
        // If this is the first page add the first row as the first potential footer.
        if (prev.length === 0) {
            return [row];
        }

        // If it's the same page replace the last footer row with this one (in-place).
        if (prev[prev.length-1].page === row.page) {
            prev[prev.length-1] = row;
            return prev;
        }

        // Otherwise if we've moved to a new page add the row as a new potential footer.
        return [...prev, row];

    }, new Array<Row>());

    // If we've only got one page or an empty document we can't determine
    // what the footer looks like so return the original rows.
    if (footers.length <= 1) {
        return rows;
    }

    // Compute the lower diagonal similarity matrix between the potential footers based on their y coordinate
    const m = footers.map((ri, i) => footers.map((rj, j) =>
        (j < i) ? _cmpFooters(ri, rj) : undefined
    ))

    // Create clusters of matching footers from the similarity matrix
    const clusters: number[][] = []; // index[]
    let largestCluster: [number, number] = undefined; // [index, size]
    for (let i = 0; i < footers.length; ++i) {
        let cluster: number[] = undefined;
        for (let j = i+1; j < footers.length; ++j) {
           if (!!m[j][i]) {
               cluster = !!cluster ? [...cluster, j] : [i, j];
           }
        }
        if (cluster !== undefined) {
            clusters.push(cluster);
            if (largestCluster === undefined || cluster.length > largestCluster[1]) {
                largestCluster = [clusters.length-1, cluster.length];
            }
        }
    }

    // If we have found a cluster then check if the number of footers in the cluster is enough.
    if (largestCluster !== undefined) {
        if ((largestCluster[1] / footers.length) > (options?.confidence ?? DefaultFooterOptions.confidence)) {
            // Get the rows without the footers we've identified
            const cluster = clusters[largestCluster[0]]
            const footerRowNumbers = new Set(cluster.map((i) => footers[i].rowNumber));

            const newRows = rows
                .filter((row => !footerRowNumbers.has(row.rowNumber)))
                .map((row, idx) => ({
                    ...row,
                    rowNumber: idx
                }));

            // Footers can be multiple rows long so apply the same filter recursively
            return stripFooters(newRows, options);
        }
    }

    // No footers found so return the original rows
    return rows;
}
