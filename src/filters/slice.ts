import {Row, TextItemWithPosition} from "../pdf2array";


export interface SliceOptions {
    verticalSlices?: number;
}


const DefaultSliceOptions: SliceOptions = {
    verticalSlices: 1024
}


function _findLocalMinima(values: number[]) {
    const result = new Array<number>();
    let minIdx = 0;   // current minimum
    let dir = 0;  // 1 = acsending, -1 = decending
    for (let i=0; i <values.length; ++i) {
        if (values[i] < values[minIdx]) {
            // If the current value is less than the minimum then update the minimum
            // and set the direction to descending.
            minIdx = i;
            dir = -1;
        }
        else if (values[i] > values[minIdx]) {
            // If the current value is more than the minimum then we're ascending.
            // If we're not already ascending then output the current minimum as
            // a new local minimum.
            if (dir !== 1) {
                result.push(minIdx);
            }
            // The next local minima must be less than the current value so keep
            // track of the current value in minIdx.
            minIdx = i;
            dir = 1;
        }
    }
    return result;
}


function _applyVerticalSliceToPage(rows: Row[], options?: SliceOptions) {
    /*
     * Quantize and count the frequency of bounding boxes.
     *
     * Count each bounding box intersecting with a bucket and sum for
     * the page. Then look for local minimums in that sum to determine where
     * to split the page vertically.
     *
     *  [...] [...] [...]
     *  [..]  [..]  [..]
     *  [.........] [...]
     * =
     * 0333321333320333320
     * |     |     |     |
     * 
     */

    // Get the max width of the rows
    const width = rows.reduce((width, row) => {
        return Math.max(width, row.items.reduce((x, item) => {
            return Math.max(x, item.x + item.width);
        }, 0));
    }, 0);

    // Compute the count of each slice
    const verticalSlices = options?.verticalSlices ?? DefaultSliceOptions.verticalSlices;
    const verticalCount = (new Array<number>(verticalSlices)).fill(0);

    for (let row of rows) {
        for (let item of row.items) {
            const left = Math.floor(verticalSlices * item.x / width);
            const right = Math.floor(verticalSlices * (item.x + item.width) / width);
            for (let i = left; i < right; ++i) {
                ++verticalCount[i];
            }
        }
    }

    // Find the local minimas.
    const localMinima = _findLocalMinima(verticalCount);

    // Each local minimum is the start of a new column
    const colXs = localMinima.map((i, idx) => {
        const start = (localMinima[idx-1] ?? 0) * width / verticalSlices;
        const end = i * width / verticalSlices;
        return [start, end];
    }).concat([[
        (localMinima[localMinima.length-1] ?? 0) * width / verticalSlices,
        Infinity
    ]]);

    // Coalesce the items to fit within the new columns
    return rows.map((row) => {
        const newRow: Row = {
            ...row,
            items: [],
            xs: []
        };

        let itemIdx = 0;
        for (let [colStart, colEnd] of colXs) {
            // Break when we're run out of items
            if (!row.items[itemIdx]) {
                break;
            }

            // Start a new item for this column with no text yet
            let newItem: TextItemWithPosition = {
                ...row.items[itemIdx],
                str: '',
                width: 0,
                height: 0,
                x: colStart
            };

            // Add each item in the current column to this item
            while (!!row.items[itemIdx] && row.items[itemIdx].x < colEnd) {
                const item = row.items[itemIdx];

                newItem = {
                    ...newItem,
                    width: item.x + item.width - colStart,
                    height: Math.max(newItem.height, item.height),
                    str: (newItem.str.length && item.str.length) ? `${newItem.str} ${item.str}` : item.str
                }

                ++itemIdx;
            }

            // Add the new merged item to the new row
            newRow.items.push(newItem);
            newRow.xs.push(colStart);
        }

        return newRow;
    })
}

/**
 * Gather the tokens spacially using an algorithm inspired
 * by 'Spatial Layout based Information and Content Extraction (SLICE)'
 * https://www.statcan.gc.ca/en/data-science/network/pdf-extraction
 * 
 * @param rows
 * @param options
 */
export function applySlice(rows: Row[], options?: SliceOptions) {
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


    // Apply slice to each page independently
    return pages.reduce((prev, {rows}) => {
        const sliced = _applyVerticalSliceToPage(rows);
        return prev.concat(sliced);
    }, [])
}
