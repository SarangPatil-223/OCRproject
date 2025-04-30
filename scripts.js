async function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const output = document.getElementById('output');
    output.textContent = "Processing...";

    if (!file) {
        output.textContent = "No file selected.";
        return;
    }

    const fileType = file.type;

    if (fileType === 'application/pdf') {
        await extractTextFromPDF(file);
    } else if (fileType === 'image/png' || fileType === 'image/jpeg') {
        extractTextFromImage(file);
    } else {
        output.textContent = "Unsupported file type.";
    }
}

function extractTextFromImage(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        Tesseract.recognize(e.target.result, 'eng', {
            logger: info => console.log(info), // Optional: to see the progress
            psm: 12,
            oem: 3
        })
        .then(({ data: { text, confidence } }) => {
            document.getElementById('textOutput').value = text;
            const accuracy = checkTextForAccuracy(text);
            animateAccuracy(accuracy);
        })
        .catch((err) => {
            document.getElementById('output').textContent = 'Error: ' + err;
        });
    };
    reader.readAsDataURL(file);
}

async function extractTextFromPDF(file) {
    const reader = new FileReader();

    reader.onload = async function (e) {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let textPromises = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const dataURL = canvas.toDataURL('image/png');

            textPromises.push(
                Tesseract.recognize(dataURL, 'eng', {
                    logger: info => console.log(info),
                    psm: 6,
                    oem: 1
                }).then(result => {
                    const accuracy = checkTextForAccuracy(result.data.text);
                    animateAccuracy(accuracy);
                    return result.data.text;
                })
            );
        }

        try {
            const texts = await Promise.all(textPromises);
            document.getElementById('textOutput').value = texts.join('\n');
        } catch (err) {
            document.getElementById('output').textContent = 'Error: ' + err;
        }
    };

    reader.readAsArrayBuffer(file);
}

function checkTextForAccuracy(extractedText) {
    // Add logic to evaluate the quality of extractedText.
    // For example, check for unexpected characters, large amounts of whitespace, and non-standard symbols.
    let accuracy = 100;
    const unexpectedCharacters = /[^a-zA-Z0-9\s.,!?]/g;
    const errorMatches = extractedText.match(unexpectedCharacters);

    // Penalize for each non-standard character or large number of spaces (indicating potential OCR issues)
    if (errorMatches) {
        const penalty = errorMatches.length * 2;  // Example: Deduct 2% per error.
        accuracy = Math.max(accuracy - penalty, 0);
    }

    return accuracy;
}

function normalizeConfidence(confidence) {
    if (confidence < 80) {
        return confidence + 15; // Increase lower scores for readability
    } else if (confidence > 95) {
        return 100; // Cap confidence at 100%
    } else {
        return confidence;
}
}

function animateAccuracy(accuracy) {
    const accuracyElement = document.getElementById('accuracy');
    const accuracyBar = document.getElementById('accuracyBar');
    let currentAccuracy = 0;
    const interval = setInterval(() => {
        if (currentAccuracy < accuracy) {
            currentAccuracy += 1;
            accuracyElement.innerText = `${currentAccuracy}%`;
            accuracyBar.style.width = `${currentAccuracy}%`;
        } else {
            clearInterval(interval);
        }
    }, 20);
}


function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const textContent = document.getElementById('textOutput').value;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const maxLineWidth = pageWidth - margin * 2;
    const lineHeight = 10;
    const pageHeight = doc.internal.pageSize.getHeight() - margin;

    const formattedText = doc.splitTextToSize(textContent, maxLineWidth);

    let currentHeight = margin;

    formattedText.forEach((line) => {
        if (currentHeight + lineHeight > pageHeight) {
            doc.addPage();
            currentHeight = margin;
        }
        doc.text(line, margin, currentHeight);
        currentHeight += lineHeight;
    });

    doc.save('extracted-text.pdf');
}

function downloadTxt() {
    const textContent = document.getElementById('textOutput').value;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'extracted-text.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
