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

});
