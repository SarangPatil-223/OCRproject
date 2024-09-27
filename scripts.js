document.getElementById('processButton').addEventListener('click', () => { 
    const fileInput = document.getElementById('Upload'); 
    const textOutput = document.getElementById('Text output...'); 
    if (fileInput.files.length == 0) { 
        alert('Please upload an image first.'); 
        return 0; 
    } 
    const file = fileInput.files[0]; 
    Tesseract.recognize( 
        file, 
        'eng', 
        { 
            logger: info => console.log(info) 
        } 
    ).then(({ data: { text } }) => { 
        textOutput.value = text; 
    }).catch(error => { 
        console.error(error); 
        alert('An error occurred during OCR processing.'); 
    }); 
}); 
document.getElementById('downloadButton').addEventListener('click', () => { 
    const textOutput = document.getElementById('Text output...').value; 
    if (!textOutput) { 
        alert('No text available to download.'); 
        return;
    } 
    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF(); 
    doc.text(textOutput, 10, 10); 
    doc.save('output.pdf'); 
}); 

 

