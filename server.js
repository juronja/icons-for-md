import express from 'express'
import ViteExpress from "vite-express"
import { Cheerio } from 'cheerio'


// Start express server
const app = express() // Initialize the express server

const max_icons_in_row = 15
const icon_display_size = 48 // This will be the viewBox size for each icon in the combined SVG
const icon_content_size = 36 // This is the actual size you want the icon SVG to be within its container
const gap = 5 // Gap between icons


// Global variables to store icon metadata fetched from GitHub
let globalIconNameList = []


// Middleware
app.use(express.json()) // needed to parse the JSON to JS first, otherwise you gat an error!


// Fetches the list of icon names and themed icon information from the GitHub repository.
// This function is called once when the server starts to populate global metadata.
async function fetchIconMetadata() {
    console.log("Fetching icon metadata from GitHub...")
    try {
        const response = await fetch("https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/tree.json")
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const iconsData = await response.json()

        // Extract icon names without '.svg' extension
        globalIconNameList = iconsData.svg.map(filename =>
            filename.endsWith('.svg') ? filename.slice(0, -4) : filename
        )

        console.log("Icon metadata fetched successfully.")
    } catch (error) {
        console.error("Error fetching icon metadata:", error)
    }
}


// Fetches SVG icon content directly from the GitHub repository.
async function fetchIcons(iconName) {
    const iconUrl = `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/${iconName}.svg`
    try {
        const response = await fetch(iconUrl)
        if (!response.ok) {
            console.warn(`Failed to fetch SVG for ${iconName}: ${response.status} ${response.statusText}`)
            return null
        }
        const svgStringContent = await response.text()
        return svgStringContent
    } catch (error) {
        console.error(`Error fetching SVG for ${iconName}:`, error)
        return null
    }
}


// Generates a combined SVG image from a list of icon names. Each icon will be placed within its own rounded rectangle background.
async function generateCombinedSvg(iconNames, maxIconsInRow) {
    const validIconNames = iconNames.filter(name => globalIconNameList.includes(name))

    const backgroundColor = 'rgb(36, 41, 56)'
    const borderRadius = 8
    const effectivePadding = (icon_display_size - icon_content_size) / 2

    const individualIconSVGPromises = validIconNames.map(async name => {
        const svgContent = await fetchIcons(name)

        if (typeof svgContent !== 'string') {
            console.warn(`Skipping icon "${name}" because its SVG content is not a string.`);
            return null;
        }

        const svgMatch = svgContent.match(/<svg([^>]*)>([\s\S]*?)<\/svg>/i);

        if (!svgMatch) {
            console.warn(`Invalid SVG structure for icon "${name}": Cannot find root <svg> tag.`);
            return null;
        }

        const svgAttributesString = svgMatch[1];
        const svgInnerContent = svgMatch[2];

        let originalViewBox = null;

        // 1. Try to extract viewBox attribute
        const viewBoxMatch = svgAttributesString.match(/viewBox="([^"]*)"/i);
        if (viewBoxMatch) {
            originalViewBox = viewBoxMatch[1];
        } else {
            // 2. If viewBox not found, try to extract width and height attributes
            const widthMatch = svgAttributesString.match(/width="(\d+(\.\d+)?)"/i);
            const heightMatch = svgAttributesString.match(/height="(\d+(\.\d+)?)"/i);

            if (widthMatch && heightMatch) {
                const width = parseFloat(widthMatch[1]);
                const height = parseFloat(heightMatch[1]);
                // Construct a viewBox from width and height, assuming 0 0 origin
                originalViewBox = `0 0 ${width} ${height}`;
                console.log(`Info: Icon "${name}" has no viewBox, but width/height found. Using inferred viewBox: "${originalViewBox}"`);
            } else {
                // 3. If neither viewBox nor width/height found, omit the icon and warn
                console.warn(`Skipping icon "${name}": Neither viewBox nor width/height attributes found in the SVG. Cannot determine dimensions.`);
                return null;
            }
        }

        return `
            <svg width="${icon_display_size}" height="${icon_display_size}" viewBox="0 0 ${icon_display_size} ${icon_display_size}">
                <rect x="0" y="0" width="${icon_display_size}" height="${icon_display_size}" rx="${borderRadius}" ry="${borderRadius}" fill="${backgroundColor}"/>
                <svg x="${effectivePadding}" y="${effectivePadding}" width="${icon_content_size}" height="${icon_content_size}" viewBox="${originalViewBox}" preserveAspectRatio="xMidYMid meet">
                    ${svgInnerContent}
                </svg>
            </svg>
        `
    })

    const individualIconSVGs = await Promise.all(individualIconSVGPromises)
    const filteredIndividualSVGs = individualIconSVGs.filter(Boolean)

    const numRows = Math.ceil(filteredIndividualSVGs.length / maxIconsInRow)
    const actualMaxCols = Math.min(maxIconsInRow, filteredIndividualSVGs.length)

    const finalWidth = actualMaxCols * icon_display_size + (actualMaxCols > 0 ? (actualMaxCols - 1) * gap : 0)
    const finalHeight = numRows * icon_display_size + (numRows > 0 ? (numRows - 1) * gap : 0)

    let combinedSVGContent = ''
    for (let i = 0; i < filteredIndividualSVGs.length; i++) {
        const col = i % maxIconsInRow
        const row = Math.floor(i / maxIconsInRow)

        const x = col * (icon_display_size + gap)
        const y = row * (icon_display_size + gap)

        // Wrap each individual SVG in a <g> element and translate it
        combinedSVGContent += `<g transform="translate(${x},${y})">${filteredIndividualSVGs[i]}</g>`
    }

    return `
        <svg width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg">
            ${combinedSVGContent}
        </svg>
    `
}


// CORS Middleware: Enables cross-origin requests from your frontend to this backend.
// This is essential if your frontend is served from a different domain/port than your backend.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*') // Allows requests from any origin
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS') // Allows GET and OPTIONS methods
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization') // Allows specific headers
    next() // Pass control to the next middleware/route handler
})

// Route for generating and serving combined SVG images
// This route is asynchronous because it calls `generateSvg` which performs fetches.
app.get('/icons', async (req, res) => {
  const i = req.query.i // Get icon names from 'i' query parameter
  if (!i) {
      // If no icons are specified, return a 400 Bad Request error
      return res.status(400).send("You didn't specify any icons! Use '?i=icon1,icon2'")
  }

  if (max_icons_in_row < 1 || max_icons_in_row > 50) {
      // Validate perLine parameter
      return res.status(400).send('Icons per line must be a number between 1 and 50')
  }
  // Split the comma-separated icon names to array
  const iSplit = i.split(',').map(name => name)

  try {
      const svgString = await generateCombinedSvg(iSplit, max_icons_in_row)
      res.setHeader('Content-Type', 'image/svg+xml')
      res.send(svgString)
  } catch (error) {
      console.error("Error generating combined SVG:", error)
      res.status(500).send("Error generating image. Please try again later.")
  }
})

// Route for serving the list of all available icon names (API endpoint)
app.get('/api/icons', (req, res) => {
    // Return the global list of icon names as JSON
    res.json(globalIconNameList)
})


// app.listen(3000, () => { console.log('Server is listening on port 3000') }) // replaced by ViteExpress
ViteExpress.listen(app, 3000, async () => {
    await fetchIconMetadata()
    console.log("Server is listening on:\n\nhttp://localhost:3000\n\n")
})
