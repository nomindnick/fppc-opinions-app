#!/bin/bash
# Upload PDFs to R2 in parallel
# Usage: bash scripts/upload_pdfs.sh

BUCKET="fppc-opinions"
PDF_DIR="/home/nick/Projects/fppc-opinions-corpus/raw_pdfs"
PARALLEL=8

upload_file() {
    local file="$1"
    local relative="${file#$PDF_DIR/}"
    local key="pdfs/${relative}"
    npx wrangler r2 object put "${BUCKET}/${key}" --file "$file" --remote 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "OK: ${key}"
    else
        echo "FAIL: ${key}" >&2
    fi
}

export -f upload_file
export BUCKET PDF_DIR

echo "Finding PDFs..."
TOTAL=$(find "$PDF_DIR" \( -name "*.pdf" -o -name "*.PDF" \) | wc -l)
echo "Uploading ${TOTAL} PDFs with ${PARALLEL} parallel workers..."

find "$PDF_DIR" \( -name "*.pdf" -o -name "*.PDF" \) | \
    xargs -P "$PARALLEL" -I {} bash -c 'upload_file "$@"' _ {}

echo "Done."
