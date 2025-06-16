import express from 'express'
import ViteExpress from "vite-express"
import sharp from 'sharp'


// Start express server
const app = express() // Initialize the express server


const max_icons_in_row = 15
const icon_size = 48
const SCALE = icon_size / (300 - 44)

// Global variables to store icon metadata fetched from GitHub
let globalIconNameList = []


// Middleware
app.use(express.json()) // needed to parse the JSON to JS first, otherwise you gat an error!
//app.use(express.static('dist')) // serves the index.html file on load from the dist folder, so you can use the frontend app on the express app port (e.g. - localhost:3000). This is actually not needed if you configure the vite.config server.proxy!



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
        // In a production environment, you might want a more robust error handling:
        // - Retry fetching after a delay
        // - Serve a default error page or a message indicating the issue
    }
}


// Fetches SVG icon content directly from the GitHub repository.
async function fetchSvgIconContent(iconName) {
    const iconUrl = `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/${iconName}.svg`
    console.log(`Fetching SVG source icon: ${iconUrl}`); // Debugging line
    try {
        const response = await fetch(iconUrl)
        if (!response.ok) {
            console.warn(`Failed to fetch SVG for ${iconName}: ${response.status} ${response.statusText}`)
            return null
        }
        return await response.arrayBuffer() // Get as ArrayBuffer
    } catch (error) {
        console.error(`Error fetching SVG for ${iconName}:`, error)
        return null
    }
}

function createRoundedRectSVG(width, height, radius, fillColor) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fillColor}"/>
            </svg>`
}

// Generates a combined WEBP of icon names.
async function generateRasterImage(iSplit, max_icons_in_row, outputFormat = 'webp') {
    const validIconNames = iSplit.filter(name => globalIconNameList.includes(name))

    // Define background properties
    const backgroundColor = 'rgb(36, 41, 56)' // Example: semi-transparent white
    const borderRadius = 8 // Example border-radius in pixels
    const gap = 5 // Gap between icons (both horizontally and vertically)

    // The desired size for the background container (from original icon_size)
    const backgroundContainerSize = icon_size // 48px

    // The desired size for the icon content itself
    const iconContentSize = 36 // 46px, as requested

    // Calculate padding needed to center the 46px icon within the 48px background container
    const effectivePadding = (backgroundContainerSize - iconContentSize) / 2 // (48 - 46) / 2 = 1px

    // Create the rounded rectangle SVG for the background
    const backgroundSVG = createRoundedRectSVG(backgroundContainerSize, backgroundContainerSize, borderRadius, backgroundColor)
    const backgroundBuffer = Buffer.from(backgroundSVG)

    // Fetch all individual SVG images concurrently and render them
    const imagePromises = validIconNames.map(async name => {
        // --- MODIFICATION START (Step 2 Example - inside generateRasterImage) ---
        const svgBuffer = await fetchSvgIconContent(name) // Call the new SVG fetch function
        if (!svgBuffer) {
            return null
        }

        // Create sharp instance from SVG buffer.
        // Use a high 'density' to ensure sharp rasterization of the vector graphic.
        // Then resize the resulting high-res raster to iconContentSize.
        const iconSharp = sharp(Buffer.from(svgBuffer))
          .resize(iconContentSize, iconContentSize, {
            fit: 'contain', // Ensure the entire icon fits without cropping
            background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background for the contained area
        })

        const iconResizedBuffer = await iconSharp.toBuffer()

        // Create a blank image for the individual icon's composite, sized for the background container
        const iconCanvas = sharp({
            create: {
                width: backgroundContainerSize,
                height: backgroundContainerSize,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
            }
        })

        // Composite the background and then the resized icon onto the canvas
        return iconCanvas.composite([
            { input: backgroundBuffer, top: 0, left: 0 },
            { input: iconResizedBuffer, top: effectivePadding, left: effectivePadding } // Use calculated padding
        ]).webp().toBuffer() // Convert to WEBP for consistency
    })

    // Filter out nulls and convert ArrayBuffers to Sharp image instances
    const individualIconComposites = (await Promise.all(imagePromises)).filter(Boolean)

    // Calculate dimensions of the final combined image
    const numRows = Math.ceil(individualIconComposites.length / max_icons_in_row)
    const actualMaxCols = Math.min(max_icons_in_row, individualIconComposites.length)

    // Calculate final width and height considering the background container size and gaps
    const finalWidth = actualMaxCols * backgroundContainerSize + (actualMaxCols > 0 ? (actualMaxCols - 1) * gap : 0)
    const finalHeight = numRows * backgroundContainerSize + (numRows > 0 ? (numRows - 1) * gap : 0)


    // Create a blank canvas for the final composite
    const compositeImage = sharp({
        create: {
            width: finalWidth,
            height: finalHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        }
    })

    // Prepare composite operations
    const composites = []
    for (let i = 0; i < individualIconComposites.length; i++) {
        const col = i % max_icons_in_row
        const row = Math.floor(i / max_icons_in_row)

        const x = col * (backgroundContainerSize + gap)
        const y = row * (backgroundContainerSize + gap)

        composites.push({
            input: individualIconComposites[i],
            top: y,
            left: x
        })
    }

    // Composite all individual icon images onto the main canvas
    return await compositeImage.composite(composites)
        .webp()
        .toBuffer()
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
      const imageBuffer = await generateRasterImage(iSplit, max_icons_in_row)
      // Set the Content-Type based on the output format
      res.setHeader('Content-Type', 'image/webp')
      res.send(imageBuffer)
  } catch (error) {
      console.error("Error generating raster image:", error)
      res.status(500).send("Error generating image. Please try again later.")
  }
})

// Route for serving the list of all available icon names (API endpoint)
app.get('/api/icons', (req, res) => {
    // Return the global list of icon names as JSON
    res.json(globalIconNameList)
})


// app.listen(3000, () => { console.log('Server is listening on port 3000') }) // replaced by ViteExpress
ViteExpress.listen(app, 3000, async () =>
    await fetchIconMetadata(),
    console.log("Server is listening on:\n\nhttp://localhost:3000\n\n"),
  )
