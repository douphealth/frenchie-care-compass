import jsPDF from 'jspdf';
import { PlanSection } from './planGenerator';
import { QuizAnswers } from './quizData';

function stageLabel(value: string) {
  return value === 'puppy' ? 'Puppy' : value === 'senior' ? 'Senior' : 'Adult';
}

function weightLabel(value: string) {
  return value === 'under20' ? 'Under 20 lbs' : value === '20-28' ? '20-28 lbs' : 'Over 28 lbs';
}

function cleanText(value: string) {
  return value
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateFreePDF(plan: PlanSection[], answers: QuizAnswers): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 16;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(110, 105, 100);
    doc.text('FrenchyFab Care Compass - Free Quick Plan', margin, pageHeight - 10);
    doc.text('General education only; consult your veterinarian for medical decisions.', pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 22) {
      addFooter();
      doc.addPage();
      y = 20;
    }
  };

  doc.setFillColor(76, 40, 30);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(25);
  doc.text('Your Frenchie Quick Plan', pageWidth / 2, 31, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Personalized free summary from FrenchyFab Care Compass', pageWidth / 2, 44, { align: 'center' });

  y = 82;
  doc.setTextColor(55, 38, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Profile', margin, y);
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const profileRows = [
    ['Life stage', stageLabel(answers.lifeStage)],
    ['Weight range', weightLabel(answers.weight)],
    ['Body condition', String(answers.bodyCondition) + '/9'],
    ['Activity', answers.activityLevel || 'Not specified'],
    ['Primary concern', answers.concern || 'General wellness'],
  ];
  profileRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 38, y);
    y += 7;
  });

  y += 5;
  doc.setFillColor(248, 244, 238);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 70, 64);
  const intro = doc.splitTextToSize(
    'This free PDF is a concise summary of your on-screen plan. The paid Frenchie Care Vault is a separate, verified purchase and includes the extended feeding chart, printable checklists, seasonal calendar, vet-prep sheets and emergency reference pages.',
    contentWidth - 10
  );
  doc.text(intro, margin + 5, y + 7);
  y += 34;

  const freeSections = plan.slice(0, 4);
  freeSections.forEach((section) => {
    ensureSpace(34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(76, 40, 30);
    doc.text(cleanText(section.title), margin, y);
    y += 7;

    section.items.slice(0, 3).forEach((item) => {
      const text = cleanText(item);
      const lines = doc.splitTextToSize(text, contentWidth - 8);
      ensureSpace(lines.length * 5 + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(55, 38, 25);
      doc.text('-', margin + 1, y);
      doc.text(lines, margin + 6, y);
      y += lines.length * 5 + 3;
    });
    y += 5;
  });

  ensureSpace(36);
  doc.setFillColor(245, 230, 190);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setTextColor(76, 40, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Need the complete care operating system?', margin + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const upgrade = doc.splitTextToSize(
    'Return to care-plan.frenchyfab.com and choose Frenchie Care Vault for the extended premium PDF and printable reference tools.',
    contentWidth - 12
  );
  doc.text(upgrade, margin + 6, y + 15);

  addFooter();
  doc.save('frenchie-care-plan-free.pdf');
}
