# pdf2array

[![Tests](https://github.com/tonyroberts/pdf2array/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/tonyroberts/pdf2array/actions/workflows/tests.yml)

pdf2array is a Typescript package that loads PDF files and extracts text as a tabular array of values.

It uses [pdf.js](https://github.com/mozilla/pdf.js/) and is intended to make extracting tabular data from PDF files simpler.

For example usage see the [online demo](https://tonyroberts.github.io/pdf2array/).

### Usage
```
import * as fs from "fs";
import * as path from "path";
import pdf2array from "pdf2array";

const data = fs.readFileSync(path.resolve(__dirname, "./file-sample_150kB.pdf"));
const array = await pdf2array(data);
```

### Functions

#### pdf2array(data: Buffer, options?: Pdf2ArrayOptions): Promise<string[][]>

- `data`: A `Buffer` containing the PDF file content.
- `options`: An optional object with parameters to customize the extraction process (see below).
- Returns a `Promise` that resolves to a 2D array of strings, where each inner array represents a row in the PDF, and each string represents an individual text element.

### Options

#### stripFooters: boolean (default: false)

- When set to `true`, removes footers from the output array. To be considered a footer, the text must appear at the bottom of the page.

#### stripSuperscript: boolean (default: false)

- When set to `true`, removes superscript text (like footnote markers) from the output array.

### Example
```
import * as fs from "fs";
import * as path from "path";
import pdf2array from "pdf2array";

const data = fs.readFileSync(path.resolve(__dirname, "./file-sample_150kB.pdf"));

const options = {
  stripFooters: true,
  stripSuperscript: true
};

const array = await pdf2array(data, options);
```

### Tests

The library includes tests to check if the PDF extraction and options are working as expected. Some of the tests include:

- Reading a PDF file into an array.
- Stripping footers from the output array.
- Stripping superscript text from the output array.

### Known Issue: ARM64 Mac Silicon

If you are using an ARM64 Mac (Apple Silicon) and encounter a build failure, it might be due to some required dependencies not being installed correctly. To resolve this issue, you can try installing the following Homebrew packages, which are necessary to build `pdf2array` on ARM64 Macs:

brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman

By installing these packages, you ensure that the required dependencies are available for the build process, allowing you to successfully compile `pdf2array` on an ARM64 Mac.


## Contribution

This is a hobby project and your contributions are welcome.

If you would like to support this project please consider buying me a coffee.

<a href="https://www.buymeacoffee.com/tonyroberts" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

## License

Licensed under the [MIT License](https://raw.githubusercontent.com/tonyroberts/pdf2array/main/LICENSE).

## Support

No support is available for this project. You may raise pull requests and issues but no guarantee of a response is offered or should be assumed.
