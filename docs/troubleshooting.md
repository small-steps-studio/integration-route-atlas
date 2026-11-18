# Troubleshooting

## The report says the file is not valid

A file is read as XML routes when it has a routes, route, camelContext or routeContext tag, and as YAML routes when a line is - route: or - from:. Other files are reported as containing no Camel routes. Java DSL routes (RouteBuilder classes) are not read.

## The file is too large

Reports read files up to the size set in `integrationRouteAtlas.maxFileSizeMB` (50 MB by default and at most). VS Code passes files only up to 50 MB to extensions, so a larger file cannot be read by any extension: split it, or save a shorter one.

## The preview does not open

The report always opens as a Markdown document. If the preview stays closed, set `integrationRouteAtlas.openReportsAsPreview` to true and check that the built-in Markdown extension is enabled.

## Pro or the trial does not unlock

Run **Integration Route Atlas: Show Licence Status**. It tells whether a key is stored, whether it was checked, and how many trial days are left. Details are in [licence.md](licence.md).

## Something else

Run **Integration Route Atlas: Report A Problem**. It copies a diagnostics block (versions, settings, licence state; no file contents) and opens the issues page.
