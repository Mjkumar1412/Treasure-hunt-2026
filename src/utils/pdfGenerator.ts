import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Clue, Team } from '../types';

export const generateCluePDF = (clue: Clue, team: Team) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  // Header
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TREASURE HUNT CLUE', 105, 25, { align: 'center' });

  // Team Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Team: ${team.name || team.loginId}`, 20, 55);
  doc.text(`Scan Time: ${timestamp}`, 20, 62);
  doc.text(`Clue Sequence: #${clue.sequence}`, 20, 69);

  // Clue Box
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1);
  doc.roundedRect(15, 80, 180, 80, 5, 5, 'D');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('YOUR CLUE:', 25, 95);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const splitText = doc.splitTextToSize(clue.content, 160);
  doc.text(splitText, 25, 110);

  // Next Steps
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NEXT STEPS:', 20, 175);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Solve the clue above to find the next location.', 20, 185);
  doc.text('2. Locate the hidden QR code at that spot.', 20, 192);
  doc.text('3. Scan it using the website scanner to progress.', 20, 199);

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Designed by M.J KUMAR', 105, 280, { align: 'center' });

  return doc;
};

export const downloadCluePDF = (clue: Clue, team: Team) => {
  const doc = generateCluePDF(clue, team);
  doc.save(`Clue_${clue.sequence}_${team.name || team.loginId}.pdf`);
};

export const shareCluePDF = async (clue: Clue, team: Team) => {
  const doc = generateCluePDF(clue, team);
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], `Clue_${clue.sequence}.pdf`, { type: 'application/pdf' });

  if (navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: 'Treasure Hunt Clue',
        text: `Here is our clue #${clue.sequence}!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      downloadCluePDF(clue, team);
    }
  } else {
    downloadCluePDF(clue, team);
  }
};
