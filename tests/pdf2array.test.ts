import * as fs from "fs";
import * as path from "path";
import pdf2array from "../src/index";

describe('pdf2array', () => {

    it('should read a pdf file into an array', async () => {
        const data = fs.readFileSync(path.resolve(__dirname, "./file-sample_150kB.pdf"))
        expect(data).not.toBeNull()

        const array = await pdf2array(data);
        expect(array).not.toBeNull();
        expect(array.length).toEqual(97);
        expect(array[43]).toEqual(["Lorem ipsum", "Lorem ipsum", "Lorem ipsum"]);
    });

    it('should strip footers', async () => {
        const data = fs.readFileSync(path.resolve(__dirname, "./with_footer.pdf"))
        expect(data).not.toBeNull()

        // With footers first
        const withFooters = await pdf2array(data, {
            stripFooters: false
        });

        expect(withFooters).not.toBeNull();
        expect(withFooters[withFooters.length-1]).toEqual(
            ["Page 4", "Lorem ipsum", "Tuesday, December 6, 2022"]);

        // Now without footers
        const withoutFooters = await pdf2array(data, {
            stripFooters: true
        });

        expect(withoutFooters).not.toBeNull();
        expect(withoutFooters[withoutFooters.length-1]).toEqual(
            ["amet id sapien."]);
    });

});
