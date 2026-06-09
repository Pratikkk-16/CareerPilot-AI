import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Polyfill DOMMatrix for Node.js environments to prevent pdf-parse/pdfjs-dist canvas renderer from crashing
  if (typeof (global as any).DOMMatrix === "undefined") {
    (global as any).DOMMatrix = class DOMMatrix {};
  }
  
  // Use require inside handler because pdf-parse has side effects (loading DOM Matrix canvas helpers)
  // that crash Next.js build page data collection if loaded globally.
  let PDFParse;
  try {
    const pdfParseModule = require("pdf-parse");
    PDFParse = pdfParseModule.PDFParse;
  } catch (e: any) {
    console.error("Failed to require pdf-parse:", e);
    return NextResponse.json(
      { error: `Failed to load PDF library: ${e.message || e}` },
      { status: 500 }
    );
  }

  if (!PDFParse) {
    return NextResponse.json(
      { error: "PDFParse class not found in pdf-parse library exports" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded in the request" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Instantiate PDFParse
    const parser = new PDFParse({ data: buffer });
    
    // Extract text
    const parsedData = await parser.getText();
    
    // Extract optional info/metadata
    let info = {};
    try {
      const infoResult = await parser.getInfo();
      info = infoResult.info || {};
    } catch (infoError) {
      console.warn("Failed to extract PDF metadata info:", infoError);
    }

    // Destroy parser to release memory/workers
    await parser.destroy();

    // Return the extracted text
    return NextResponse.json({
      text: parsedData.text,
      info: info,
      pages: parsedData.total,
    });
  } catch (error: any) {
    console.error("PDF Extract API error:", error);
    return NextResponse.json(
      { error: `Failed to extract PDF content: ${error.message || error}` },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
