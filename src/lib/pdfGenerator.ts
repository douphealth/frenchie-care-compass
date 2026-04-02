import jsPDF from 'jspdf';
import { PlanSection } from './planGenerator';
import { QuizAnswers } from './quizData';
import frenchieHeroUrl from '@/assets/frenchie-hero.png';
import frenchieFaceUrl from '@/assets/frenchie-face.png';
import pawIconUrl from '@/assets/paw-icon.png';

/* ── Image loader helper (compressed JPEG with white fill for transparency) ── */
async function loadImageAsBase64(url: string, maxWidth = 400, quality = 0.7): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      // Fill with cream/white background to prevent black on transparent PNGs
      ctx.fillStyle = '#FAF5EB';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = URL.createObjectURL(blob);
  });
}

/* Load image as PNG (preserves transparency) for use on dark backgrounds */
async function loadImageAsPng(url: string, maxWidth = 400): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      // No background fill — keep transparency
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = URL.createObjectURL(blob);
  });
}
/* ── Brand Palette (RGB) ── */
const C = {
  cream:      [250, 245, 235] as const,
  brown:      [76, 40, 30]    as const,
  terracotta: [190, 115, 80]  as const,
  white:      [255, 255, 255] as const,
  offWhite:   [248, 244, 238] as const,
  lightGray:  [230, 225, 215] as const,
  border:     [215, 205, 192] as const,
  text:       [55, 38, 25]    as const,
  textMuted:  [130, 115, 100] as const,
  gold:       [210, 160, 60]  as const,
  goldLight:  [245, 230, 190] as const,
  success:    [60, 150, 100]  as const,
  successBg:  [230, 248, 235] as const,
  warningBg:  [255, 245, 225] as const,
  warningBd:  [225, 170, 70]  as const,
  accentBg:   [240, 230, 218] as const,
  orange:     [235, 130, 60]  as const,
  orangeBg:   [255, 245, 235] as const,
  emerald:    [52, 160, 110]  as const,
  emeraldBg:  [235, 250, 240] as const,
  sky:        [56, 150, 220]  as const,
  skyBg:      [235, 245, 255] as const,
  violet:     [130, 90, 200]  as const,
  violetBg:   [245, 240, 255] as const,
  rose:       [220, 80, 100]  as const,
  roseBg:     [255, 240, 242] as const,
  amber:      [200, 140, 40]  as const as readonly [number, number, number],
  amberBg:    [255, 248, 230] as const as readonly [number, number, number],
  teal:       [40, 145, 135]  as const as readonly [number, number, number],
  tealBg:     [232, 248, 245] as const as readonly [number, number, number],
};

const SECTION_COLORS: Record<number, { accent: readonly [number, number, number]; bg: readonly [number, number, number] }> = {
  0: { accent: C.orange, bg: C.orangeBg },
  1: { accent: C.rose, bg: C.roseBg },
  2: { accent: C.emerald, bg: C.emeraldBg },
  3: { accent: C.rose, bg: C.roseBg },
  4: { accent: C.violet, bg: C.violetBg },
  5: { accent: C.sky, bg: C.skyBg },
  6: { accent: C.gold, bg: C.goldLight },
  7: { accent: C.emerald, bg: C.emeraldBg },
};

function stageLabel(s: string) { return s === 'puppy' ? 'Puppy' : s === 'senior' ? 'Senior' : 'Adult'; }
function weightLabel(w: string) { return w === 'under20' ? 'Under 20 lbs' : w === '20-28' ? '20-28 lbs' : 'Over 28 lbs'; }
function activityLabel(a: string) { return a === 'low' ? 'Low' : a === 'active' ? 'Active' : 'Moderate'; }
function concernLabel(c: string) {
  const m: Record<string, string> = { skin: 'Skin & Allergies', pulling: 'Leash Pulling', diet: 'Diet & Weight', breathing: 'Breathing', wellness: 'General Wellness' };
  return m[c] || c;
}

function stripEmoji(str: string): string {
  return str
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\u00AE/g, '(R)')
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/\u00BC/g, '1/4')
    .replace(/\u00BD/g, '1/2')
    .replace(/\u00BE/g, '3/4')
    .replace(/\u2153/g, '1/3')
    .replace(/\u2154/g, '2/3')
    .replace(/\u215B/g, '1/8')
    .replace(/\u215C/g, '3/8')
    .replace(/\u215D/g, '5/8')
    .replace(/\u215E/g, '7/8')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ── Feeding calculation helpers ── */
function getCalories(w: string, stage: string, bc: number): { min: number; max: number } {
  const weights: Record<string, [number, number]> = { under20: [10, 19], '20-28': [20, 28], over28: [29, 38] };
  const [wMin, wMax] = weights[w] || [20, 28];
  let calPerLb = 30;
  if (stage === 'puppy') calPerLb = 40;
  else if (stage === 'senior') calPerLb = 25;
  if (bc > 6) calPerLb -= 5;
  if (bc < 4) calPerLb += 5;
  return { min: wMin * calPerLb, max: wMax * calPerLb };
}

function getMealsPerDay(stage: string): number { return stage === 'puppy' ? 3 : 2; }

function getPortionPerMeal(w: string, stage: string, bc: number): { cups: string; grams: string } {
  const cal = getCalories(w, stage, bc);
  const avgCal = (cal.min + cal.max) / 2;
  const meals = getMealsPerDay(stage);
  const cupsPerMeal = avgCal / meals / 350; // ~350 cal per cup kibble
  const gramsPerMeal = cupsPerMeal * 113; // ~113g per cup
  return {
    cups: `${cupsPerMeal.toFixed(1)} cups`,
    grams: `${Math.round(gramsPerMeal)}g`,
  };
}

export async function generatePDF(plan: PlanSection[], answers: QuizAnswers): Promise<void> {
  // Load images — hero as PNG (transparent, for dark cover bg), others as JPEG
  const [heroImgPng, heroImg, faceImg, pawImg] = await Promise.all([
    loadImageAsPng(frenchieHeroUrl, 400),
    loadImageAsBase64(frenchieHeroUrl),
    loadImageAsBase64(frenchieFaceUrl),
    loadImageAsBase64(pawIconUrl),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210, ph = 297, mx = 16, contentW = pw - mx * 2;
  let y = 0;
  let pageNum = 0;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 22) { addFooter(); doc.addPage(); newPageBg(); y = 20; }
  };

  const newPageBg = () => {
    pageNum++;
    doc.setFillColor(...C.cream);
    doc.rect(0, 0, pw, ph, 'F');
    // Top decorative bar
    doc.setFillColor(...C.brown);
    doc.rect(0, 0, pw, 2.5, 'F');
    doc.setFillColor(...C.gold);
    doc.rect(0, 2.5, pw, 0.8, 'F');
    doc.setFillColor(...C.terracotta);
    doc.rect(0, 3.3, pw, 0.4, 'F');
    // Bottom accent line
    doc.setFillColor(...C.brown);
    doc.rect(0, ph - 2, pw, 2, 'F');
  };

  const addFooter = () => {
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(mx, ph - 14, pw - mx, ph - 14);
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text('FrenchyFab.com  |  Your French Bulldog Care Companion', mx, ph - 9);
    doc.link(mx, ph - 13, 60, 8, { url: 'https://frenchyfab.com' });
    doc.text(`Page ${pageNum}`, pw - mx, ph - 9, { align: 'right' });
  };

  const drawPageTitle = (title: string, accentColor: readonly [number, number, number] = C.terracotta) => {
    // Add small paw icon next to title
    try {
      doc.addImage(pawImg, 'JPEG', mx, y - 2, 8, 8);
    } catch (e) { /* fallback */ }
    doc.setFontSize(18);
    doc.setTextColor(...C.brown);
    doc.setFont('helvetica', 'bold');
    doc.text(title, mx + 10, y + 5);
    y += 12;
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.8);
    doc.line(mx, y, mx + 45, y);
    y += 10;
  };

  const drawSectionHeader = (title: string, sectionIdx: number) => {
    ensureSpace(22);
    const colors = SECTION_COLORS[sectionIdx % 8];
    doc.setFillColor(...colors.accent);
    doc.roundedRect(mx, y, contentW, 14, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(stripEmoji(title), mx + 6, y + 9.5);
    doc.setFillColor(...C.white);
    doc.circle(pw - mx - 10, y + 7, 5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...colors.accent);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionIdx + 1}`, pw - mx - 10, y + 8.5, { align: 'center' });
    y += 18;
  };

  const drawItemCard = (text: string, isWarning: boolean, idx: number, sectionIdx: number) => {
    const cleanText = stripEmoji(text.replace(/^[^\w\s]*\s*/, ''));
    const lines = doc.splitTextToSize(cleanText, contentW - 18);
    const blockH = Math.max(lines.length * 5 + 6, 12);
    ensureSpace(blockH + 3);
    const colors = SECTION_COLORS[sectionIdx % 8];

    if (isWarning) {
      doc.setFillColor(...C.warningBg);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'F');
      doc.setDrawColor(...C.warningBd);
      doc.setLineWidth(0.4);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'S');
      doc.setFillColor(...C.gold);
      doc.roundedRect(mx, y, 3, blockH, 1, 1, 'F');
    } else {
      doc.setFillColor(...C.white);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'F');
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'S');
      doc.setFillColor(...colors.accent);
      doc.roundedRect(mx, y, 2.5, blockH, 1, 1, 'F');
    }

    const badgeColor = isWarning ? C.gold : colors.accent;
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.roundedRect(mx + 5, y + 2.5, 8, 6, 1.5, 1.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(isWarning ? '!' : `${idx + 1}`, mx + 9, y + 6.5, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, mx + 16, y + 5.5);
    y += blockH + 2;
  };

  const drawArticleLink = (label: string, url: string) => {
    ensureSpace(14);
    y += 2;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    doc.setFillColor(...C.accentBg);
    doc.roundedRect(mx, y, contentW, 10, 2, 2, 'F');
    doc.setDrawColor(...C.terracotta);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, y, contentW, 10, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setTextColor(...C.brown);
    doc.setFont('helvetica', 'bold');
    doc.text(`Read more: ${stripEmoji(label)}`, mx + 5, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.terracotta);
    doc.text(stripEmoji(url), pw - mx - 5, y + 6.5, { align: 'right' });
    // Make the entire box a clickable link
    doc.link(mx, y, contentW, 10, { url: fullUrl });
    y += 14;
  };

  /* Helper: draw a table */
  const drawTable = (headers: string[], rows: string[][], colWidths: number[], headerColor: readonly [number, number, number]) => {
    const rowH = 9;
    const headerH = 10;
    const tableW = colWidths.reduce((a, b) => a + b, 0);
    const startX = mx + (contentW - tableW) / 2;

    ensureSpace(headerH + rows.length * rowH + 4);

    // Header row
    doc.setFillColor(...headerColor);
    doc.roundedRect(startX, y, tableW, headerH, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    let colX = startX;
    headers.forEach((h, i) => {
      doc.text(h, colX + colWidths[i] / 2, y + 6.5, { align: 'center' });
      colX += colWidths[i];
    });
    y += headerH;

    // Data rows
    rows.forEach((row, rIdx) => {
      ensureSpace(rowH + 2);
      const bgColor: readonly [number, number, number] = rIdx % 2 === 0 ? C.white : C.offWhite;
      doc.setFillColor(...bgColor);
      doc.rect(startX, y, tableW, rowH, 'F');
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.15);
      doc.line(startX, y + rowH, startX + tableW, y + rowH);

      doc.setFontSize(7.5);
      doc.setTextColor(...C.text);
      colX = startX;
      row.forEach((cell, i) => {
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
        doc.text(cell, colX + colWidths[i] / 2, y + 6, { align: 'center' });
        colX += colWidths[i];
      });
      y += rowH;
    });

    // Table border
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(startX, y - rows.length * rowH - headerH, tableW, rows.length * rowH + headerH, 2, 2, 'S');
    y += 4;
  };

  /* Helper: checklist item with checkbox */
  const drawCheckItem = (text: string, bgColor: readonly [number, number, number]) => {
    ensureSpace(10);
    doc.setFillColor(...bgColor);
    doc.roundedRect(mx, y, contentW, 8, 1.5, 1.5, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.rect(mx + 4, y + 1.5, 5, 5, 'S');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'normal');
    doc.text(stripEmoji(text), mx + 13, y + 5.5);
    y += 9;
  };

  /* ═══════════════════════════════════════════════
   * PAGE 1: COVER PAGE — Premium editorial design
   * ═══════════════════════════════════════════════ */
  newPageBg();

  // Full-width dark brown header block with gold accents
  doc.setFillColor(...C.brown);
  doc.rect(0, 0, pw, 115, 'F');

  // Subtle decorative gold lines
  doc.setFillColor(...C.gold);
  doc.rect(0, 115, pw, 1.5, 'F');
  doc.setFillColor(...C.terracotta);
  doc.rect(0, 116.5, pw, 0.6, 'F');

  // Small decorative gold rule at top
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.line(pw / 2 - 25, 16, pw / 2 + 25, 16);

  doc.setFontSize(10);
  doc.setTextColor(...C.goldLight);
  doc.setFont('helvetica', 'bold');
  doc.text('FRENCHYFAB', pw / 2, 13, { align: 'center' });

  // Decorative diamond
  doc.setFillColor(...C.gold);
  doc.setDrawColor(...C.gold);

  doc.setFontSize(30);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Personalized', pw / 2, 38, { align: 'center' });
  doc.text('Frenchie Care Plan', pw / 2, 54, { align: 'center' });

  // Elegant subtitle
  doc.setFontSize(9);
  doc.setTextColor(...C.goldLight);
  doc.setFont('helvetica', 'normal');
  doc.text('Breed-Specific  •  Vet-Informed  •  Tailored to Your Dog', pw / 2, 68, { align: 'center' });

  // Hero Frenchie image on cover — PNG with transparency for dark background
  try {
    doc.addImage(heroImgPng, 'PNG', pw / 2 - 30, 74, 60, 60);
  } catch (e) { /* graceful fallback if image fails */ }

  // Profile card — refined with better spacing
  const cardY = 126;
  const cardH = 82;
  const cardMx = mx + 10;
  const cardW = contentW - 20;

  // Card shadow effect
  doc.setFillColor(220, 215, 205);
  doc.roundedRect(cardMx + 1, cardY + 1, cardW, cardH, 4, 4, 'F');
  // Main card
  doc.setFillColor(...C.white);
  doc.roundedRect(cardMx, cardY, cardW, cardH, 4, 4, 'F');
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardMx, cardY, cardW, cardH, 4, 4, 'S');

  // Card header
  doc.setFillColor(...C.accentBg);
  doc.roundedRect(cardMx, cardY, cardW, 12, 4, 4, 'F');
  doc.setFillColor(...C.white);
  doc.rect(cardMx, cardY + 8, cardW, 4, 'F');

  doc.setFontSize(8);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text("YOUR FRENCHIE'S PROFILE", pw / 2, cardY + 8, { align: 'center' });

  const profileData = [
    ['Life Stage', stageLabel(answers.lifeStage)],
    ['Weight Range', weightLabel(answers.weight)],
    ['Body Condition', `${answers.bodyCondition}/9`],
    ['Activity Level', activityLabel(answers.activityLevel)],
    ['Primary Concern', concernLabel(answers.concern)],
    ['Environment', answers.environment.length > 0 ? answers.environment.join(', ') : 'Not specified'],
  ];

  const colX1 = cardMx + 10;
  const colX2 = pw / 2 + 6;
  let profileY = cardY + 20;

  doc.setFontSize(7.5);
  profileData.forEach((item, i) => {
    const xLabel = i % 2 === 0 ? colX1 : colX2;
    const row = Math.floor(i / 2);
    const rowY = profileY + row * 15;
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(item[0].toUpperCase(), xLabel, rowY);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], xLabel, rowY + 5.5);
  });

  // Date
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${today}`, pw / 2, 222, { align: 'center' });

  // Trust badges — refined
  const badgeY = 234;
  const bw = (contentW - 28) / 3;
  const badges: { label: string; sub: string; color: readonly [number, number, number]; bg: readonly [number, number, number] }[] = [
    { label: 'Vet-Informed', sub: 'Science-backed', color: C.emerald, bg: C.emeraldBg },
    { label: 'Breed-Specific', sub: 'BOAS-aware', color: C.sky, bg: C.skyBg },
    { label: 'Personalized', sub: 'Tailored for you', color: C.terracotta, bg: C.orangeBg },
  ];

  badges.forEach((badge, i) => {
    const bx = mx + 12 + i * (bw + 2);
    doc.setFillColor(...badge.bg);
    doc.roundedRect(bx, badgeY, bw, 16, 3, 3, 'F');
    doc.setDrawColor(badge.color[0], badge.color[1], badge.color[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, badgeY, bw, 16, 3, 3, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(badge.color[0], badge.color[1], badge.color[2]);
    doc.text(badge.label, bx + bw / 2, badgeY + 7, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textMuted);
    doc.text(badge.sub, bx + bw / 2, badgeY + 12, { align: 'center' });
  });

  // Decorative bottom accent
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.line(pw / 2 - 30, 260, pw / 2 + 30, 260);

  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'italic');
  doc.text('This plan provides general guidance. Always consult your veterinarian for medical decisions.', pw / 2, 268, { align: 'center' });

  addFooter();

  /* ═══════════════════════════════════════════════
   * PAGE 2: TABLE OF CONTENTS
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 22;

  drawPageTitle('Care Plan Overview');

  plan.forEach((section, i) => {
    const colors = SECTION_COLORS[i % 8];
    doc.setFillColor(...colors.bg);
    doc.roundedRect(mx, y, contentW, 14, 2, 2, 'F');

    doc.setFillColor(...colors.accent);
    doc.circle(mx + 8, y + 7, 3, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}`, mx + 8, y + 8.5, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.text(stripEmoji(section.title), mx + 15, y + 8);

    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${section.items.length} recommendations`, pw - mx - 5, y + 8, { align: 'right' });
    y += 16;
  });

  // Bonus pages listing
  y += 4;
  const bonusPages = [
    { label: 'Custom Feeding Chart & Portions', color: C.orange },
    { label: 'Printable Grooming Checklist', color: C.rose },
    { label: 'Seasonal Care Calendar', color: C.emerald },
    { label: 'Vet Visit Prep Sheets', color: C.sky },
    { label: 'Emergency Quick Reference', color: C.rose },
  ];
  doc.setFillColor(...C.goldLight);
  doc.roundedRect(mx, y, contentW, 8, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...C.amber);
  doc.setFont('helvetica', 'bold');
  doc.text('BONUS PREMIUM PAGES', mx + 6, y + 5.5);
  y += 12;

  bonusPages.forEach((bp: { label: string; color: readonly [number, number, number] }) => {
    doc.setFillColor(...bp.color);
    doc.circle(mx + 6, y + 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'normal');
    doc.text(bp.label, mx + 12, y + 3.5);
    y += 8;
  });

  // Quick stats
  y += 6;
  doc.setFillColor(...C.white);
  doc.roundedRect(mx, y, contentW, 28, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(mx, y, contentW, 28, 3, 3, 'S');

  const totalItems = plan.reduce((sum, s) => sum + s.items.length, 0);
  const statsData = [
    { label: 'Sections', value: `${plan.length}` },
    { label: 'Recommendations', value: `${totalItems}` },
    { label: 'Bonus Pages', value: '5' },
    { label: 'Updated', value: today.split(',')[0] },
  ];
  const statW = contentW / 4;
  statsData.forEach((stat, i) => {
    const sx = mx + statW * i + statW / 2;
    doc.setFontSize(14);
    doc.setTextColor(...C.brown);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, sx, y + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label.toUpperCase(), sx, y + 18, { align: 'center' });
  });
  y += 34;

  // Disclaimer
  doc.setFillColor(...C.offWhite);
  doc.roundedRect(mx, y, contentW, 22, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(mx, y, contentW, 22, 3, 3, 'S');
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'italic');
  const disclaimer = doc.splitTextToSize(
    "DISCLAIMER: This care plan is for informational purposes only and does not replace professional veterinary advice. Always consult your veterinarian before making changes to your French Bulldog's diet, exercise, or health regimen.",
    contentW - 12
  );
  doc.text(disclaimer, mx + 6, y + 6);

  addFooter();

  /* ═══════════════════════════════════════════════
   * PAGES 3+: SECTION PAGES (Care Plan Content)
   * ═══════════════════════════════════════════════ */
  plan.forEach((section, sIdx) => {
    doc.addPage();
    newPageBg();
    y = 20;

    drawSectionHeader(section.title, sIdx);

    section.items.forEach((item, j) => {
      const isWarning = item.includes('WARNING') || item.startsWith('\u26A0');
      const cleanItem = item.replace(/^[\u26A0\uFE0F\s]+/, '');
      drawItemCard(cleanItem, isWarning, j, sIdx);
    });

    if (section.articleLink) {
      drawArticleLink(section.articleLink.label, section.articleLink.url);
    }

    addFooter();
  });

  /* ═══════════════════════════════════════════════
   * CUSTOM FEEDING CHART & PORTIONS PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  drawPageTitle('Custom Feeding Chart & Portions', C.orange);

  // Personalized calorie summary
  const cal = getCalories(answers.weight, answers.lifeStage, answers.bodyCondition);
  const meals = getMealsPerDay(answers.lifeStage);
  const portion = getPortionPerMeal(answers.weight, answers.lifeStage, answers.bodyCondition);

  doc.setFillColor(...C.orangeBg);
  doc.roundedRect(mx, y, contentW, 24, 3, 3, 'F');
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.4);
  doc.roundedRect(mx, y, contentW, 24, 3, 3, 'S');
  doc.setFontSize(9);
  doc.setTextColor(...C.orange);
  doc.setFont('helvetica', 'bold');
  doc.text("YOUR FRENCHIE'S DAILY NUTRITION TARGET", mx + 6, y + 7);
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  doc.text(`Daily Calories: ${cal.min}-${cal.max} kcal  |  Meals/Day: ${meals}  |  Per Meal: ~${portion.cups} (~${portion.grams})`, mx + 6, y + 15);
  doc.text(`Based on: ${stageLabel(answers.lifeStage)}, ${weightLabel(answers.weight)}, Body Score ${answers.bodyCondition}/9, ${activityLabel(answers.activityLevel)} activity`, mx + 6, y + 21);
  y += 30;

  // Daily feeding schedule table
  doc.setFontSize(11);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Daily Feeding Schedule', mx, y + 4);
  y += 10;

  const scheduleRows = answers.lifeStage === 'puppy'
    ? [
        ['Breakfast', '7:00 AM', portion.cups, portion.grams, 'Main kibble + DHA supplement'],
        ['Lunch', '12:30 PM', portion.cups, portion.grams, 'Main kibble + probiotic'],
        ['Dinner', '6:00 PM', portion.cups, portion.grams, 'Main kibble + fish oil'],
      ]
    : [
        ['Breakfast', '7:30 AM', portion.cups, portion.grams, 'Main kibble + probiotic + fish oil'],
        ['Dinner', '6:00 PM', portion.cups, portion.grams, 'Main kibble + any supplements'],
      ];

  drawTable(
    ['Meal', 'Time', 'Cups', 'Grams', 'Notes'],
    scheduleRows,
    [28, 24, 22, 22, contentW - 96 > 40 ? contentW - 96 : 40],
    C.orange
  );

  // Macronutrient targets
  y += 4;
  doc.setFontSize(11);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Macronutrient Targets', mx, y + 4);
  y += 10;

  const proteinTarget = answers.lifeStage === 'puppy' ? '22-28%' : answers.lifeStage === 'senior' ? '18-22%' : '22-26%';
  const fatTarget = answers.lifeStage === 'puppy' ? '10-15%' : answers.lifeStage === 'senior' ? '8-12%' : '10-15%';
  const fiberTarget = '3-5%';

  drawTable(
    ['Nutrient', 'Target %', 'Why It Matters', 'Food Sources'],
    [
      ['Protein', proteinTarget, 'Muscle maintenance & repair', 'Chicken, salmon, turkey, beef'],
      ['Fat', fatTarget, 'Energy, coat health, brain function', 'Fish oil, chicken fat, flaxseed'],
      ['Fiber', fiberTarget, 'Digestive regularity', 'Sweet potato, pumpkin, oats'],
      ['Omega-3', '0.5-1%', 'Anti-inflammatory, skin & coat', 'Salmon oil, sardines, algae'],
    ],
    [24, 22, 46, contentW - 92 > 40 ? contentW - 92 : 40],
    C.emerald
  );

  // Treat allowance
  y += 4;
  doc.setFontSize(11);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Daily Treat Allowance (10% Rule)', mx, y + 4);
  y += 10;

  const treatCal = Math.round((cal.min + cal.max) / 2 * 0.1);
  const safeTreats = [
    ['Blueberries (5-6)', `~${Math.round(treatCal * 0.15)} kcal`, 'Antioxidants, vitamins'],
    ['Baby carrot sticks (2-3)', `~${Math.round(treatCal * 0.1)} kcal`, 'Low cal, dental health'],
    ['Frozen green beans', `~${Math.round(treatCal * 0.08)} kcal`, 'Filling, very low calorie'],
    ['Small training treats', `~${Math.round(treatCal * 0.3)} kcal`, 'Use for obedience work'],
    ['Plain pumpkin (1 tbsp)', `~${Math.round(treatCal * 0.12)} kcal`, 'Fiber, digestive support'],
  ];

  drawTable(
    ['Safe Treat', `Calories (of ${treatCal} kcal budget)`, 'Benefit'],
    safeTreats,
    [46, 52, contentW - 98 > 30 ? contentW - 98 : 30],
    C.amber
  );

  // Foods to avoid
  y += 4;
  ensureSpace(40);
  doc.setFillColor(...C.roseBg);
  doc.roundedRect(mx, y, contentW, 34, 3, 3, 'F');
  doc.setDrawColor(...C.rose);
  doc.setLineWidth(0.4);
  doc.roundedRect(mx, y, contentW, 34, 3, 3, 'S');
  doc.setFillColor(...C.rose);
  doc.roundedRect(mx, y, 3, 34, 1, 1, 'F');

  doc.setFontSize(9);
  doc.setTextColor(...C.rose);
  doc.setFont('helvetica', 'bold');
  doc.text('FOODS TO AVOID -- TOXIC TO FRENCH BULLDOGS', mx + 8, y + 7);

  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  const toxicFoods = [
    'Chocolate (theobromine toxicity)  |  Grapes & Raisins (kidney failure)  |  Onions & Garlic (hemolytic anemia)',
    'Xylitol / artificial sweeteners  |  Macadamia nuts  |  Cooked bones (splintering risk)',
    'Avocado (persin toxicity)  |  Alcohol  |  Caffeine  |  Raw yeast dough',
  ];
  toxicFoods.forEach((line, i) => {
    doc.text(line, mx + 8, y + 14 + i * 6);
  });
  y += 40;

  addFooter();

  /* ═══════════════════════════════════════════════
   * PRINTABLE GROOMING CHECKLIST PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  drawPageTitle('Printable Grooming Checklist', C.rose);

  const groomingSections = [
    {
      title: 'DAILY CARE',
      color: C.emerald,
      bg: C.emeraldBg,
      items: [
        'Clean facial wrinkles with damp cloth -- dry thoroughly',
        'Clean nose fold / rope area',
        'Wipe under-eye area (tear stains)',
        'Check ears for redness, odor, or discharge',
        'Quick teeth/gum visual check',
        'Inspect paw pads for cuts or irritation',
      ],
    },
    {
      title: 'WEEKLY CARE',
      color: C.sky,
      bg: C.skyBg,
      items: [
        'Full body massage & skin inspection',
        'Brush coat 2-3x with rubber curry brush',
        'Clean ears with vet-approved ear solution',
        'Check between toes for yeast/redness',
        'Brush teeth with enzymatic dog toothpaste (3-4x/week)',
        'Inspect tail pocket and clean if needed',
      ],
    },
    {
      title: 'BIWEEKLY / MONTHLY',
      color: C.violet,
      bg: C.violetBg,
      items: [
        'Trim nails (every 2-3 weeks)',
        'Bath with pH-balanced, hypoallergenic shampoo',
        'Apply leave-in conditioner (if dry skin)',
        'Express anal glands if needed (or vet visit)',
        'Deep clean bedding, blankets, and crate',
        'Replace worn grooming tools',
      ],
    },
    {
      title: 'SEASONAL',
      color: C.amber,
      bg: C.amberBg,
      items: [
        'Spring: Start allergy management protocol',
        'Summer: Switch to cooling shampoo, increase wrinkle cleaning',
        'Fall: Prepare moisturizing routine for dry air',
        'Winter: Paw balm application before outdoor walks',
      ],
    },
  ];

  groomingSections.forEach((cls: { title: string; color: readonly [number, number, number]; bg: readonly [number, number, number]; items: string[] }) => {
    ensureSpace(50);
    doc.setFillColor(...cls.color);
    doc.roundedRect(mx, y, 40, 8, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(cls.title, mx + 20, y + 5.5, { align: 'center' });
    y += 12;

    cls.items.forEach((item) => {
      drawCheckItem(item, cls.bg);
    });
    y += 4;
  });

  // Grooming supply checklist
  ensureSpace(35);
  doc.setFillColor(...C.accentBg);
  doc.roundedRect(mx, y, contentW, 30, 3, 3, 'F');
  doc.setDrawColor(...C.terracotta);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, contentW, 30, 3, 3, 'S');
  doc.setFontSize(9);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('ESSENTIAL GROOMING SUPPLIES', mx + 6, y + 7);
  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  const supplies = [
    'Rubber curry brush  |  Hypoallergenic shampoo  |  Ear cleaning solution  |  Nail clippers/grinder',
    'Enzymatic dog toothpaste + brush  |  Wrinkle wipes (unscented)  |  Paw balm  |  Styptic powder',
    'Deshedding tool  |  Cotton balls  |  Leave-in conditioner  |  Grooming table (optional)',
  ];
  supplies.forEach((line, i) => {
    doc.text(line, mx + 6, y + 14 + i * 5.5);
  });

  addFooter();

  /* ═══════════════════════════════════════════════
   * SEASONAL CARE CALENDAR PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  drawPageTitle('Seasonal Care Calendar', C.emerald);

  const seasonHalf = (contentW - 4) / 2;
  const seasons = [
    {
      title: 'SPRING (Mar-May)',
      color: C.emerald,
      bg: C.emeraldBg,
      items: [
        'Begin flea/tick prevention',
        'Schedule annual vet checkup',
        'Update vaccinations',
        'Allergy season prep: start antihistamines if prescribed',
        'Increase outdoor walks (moderate temps)',
        'Deep clean and swap winter bedding',
        'Check for seasonal pollen allergies',
      ],
    },
    {
      title: 'SUMMER (Jun-Aug)',
      color: C.orange,
      bg: C.orangeBg,
      items: [
        'CRITICAL: Limit outdoor time to early AM/late PM',
        'Provide cooling mat and shade at all times',
        'Carry water on every walk -- offer every 10 min',
        'Watch for heatstroke signs (heavy panting, drool)',
        'Use cooling vest for temps above 70F',
        'Increase wrinkle cleaning (moisture/sweat)',
        'Test pavement temp before walks (5-sec hand test)',
      ],
    },
    {
      title: 'FALL (Sep-Nov)',
      color: C.amber,
      bg: C.amberBg,
      items: [
        'Transition to richer coat care (more brushing)',
        'Schedule dental cleaning appointment',
        'Adjust meal portions if activity decreases',
        'Continue flea/tick prevention',
        'Stock up on winter supplies (coat, boots, balm)',
        'Seasonal allergy check (ragweed, mold)',
        'Pre-winter vet wellness check',
      ],
    },
    {
      title: 'WINTER (Dec-Feb)',
      color: C.sky,
      bg: C.skyBg,
      items: [
        'Use warm coat/sweater for walks below 45F',
        'Wipe paws after walks (salt/chemical removal)',
        'Limit outdoor time in extreme cold',
        'Add humidifier indoors (prevent dry skin)',
        'Apply paw balm before and after walks',
        'Maintain exercise with indoor play/puzzles',
        'Watch for hypothermia signs (shivering, lethargy)',
      ],
    },
  ];

  // Draw 2x2 grid
  for (let row = 0; row < 2; row++) {
    const rowStartY = y;
    for (let col = 0; col < 2; col++) {
      const season = seasons[row * 2 + col];
      const sx = mx + col * (seasonHalf + 4);
      const blockY = rowStartY;

      // Season header
      doc.setFillColor(...season.color);
      doc.roundedRect(sx, blockY, seasonHalf, 9, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.text(season.title, sx + seasonHalf / 2, blockY + 6, { align: 'center' });

      // Season items
      let itemY = blockY + 12;
      season.items.forEach((item) => {
        doc.setFillColor(...season.bg);
        doc.roundedRect(sx, itemY, seasonHalf, 7.5, 1, 1, 'F');
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.1);
        doc.rect(sx + 3, itemY + 1.5, 4, 4, 'S');
        doc.setFontSize(6.5);
        doc.setTextColor(...C.text);
        doc.setFont('helvetica', 'normal');
        const itemText = doc.splitTextToSize(item, seasonHalf - 14);
        doc.text(itemText[0], sx + 10, itemY + 5);
        itemY += 8;
      });
    }
    y = rowStartY + 12 + seasons[row * 2].items.length * 8 + 8;
  }

  // Monthly reminder
  ensureSpace(20);
  doc.setFillColor(...C.goldLight);
  doc.roundedRect(mx, y, contentW, 14, 3, 3, 'F');
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, contentW, 14, 3, 3, 'S');
  doc.setFontSize(8);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('PRO TIP: Set monthly calendar reminders for flea/tick treatment, nail trims, and weigh-ins.', mx + 6, y + 9);

  addFooter();

  /* ═══════════════════════════════════════════════
   * VET VISIT PREP SHEETS PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  drawPageTitle('Vet Visit Prep Sheets', C.sky);

  // Life stage specific schedule
  doc.setFontSize(11);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text(`Recommended Schedule: ${stageLabel(answers.lifeStage)} Frenchie`, mx, y + 4);
  y += 10;

  const vetSchedule = answers.lifeStage === 'puppy'
    ? [
        ['8 Weeks', 'DHPP #1, deworming, fecal test', 'Weight, growth rate, conformation'],
        ['12 Weeks', 'DHPP #2, bordetella, deworming', 'Socialization review, bite check'],
        ['16 Weeks', 'DHPP #3, rabies vaccine', 'BOAS baseline assessment'],
        ['6 Months', 'Spay/neuter consult, bloodwork', 'Dental check, growth plate review'],
        ['12 Months', 'Full wellness exam, titers', 'Adult diet transition plan'],
      ]
    : answers.lifeStage === 'senior'
    ? [
        ['Every 6 months', 'Full bloodwork + urinalysis', 'Kidney, liver, thyroid function'],
        ['Annual', 'Dental cleaning under anesthesia', 'Discuss BOAS protocol for anesthesia'],
        ['Annual', 'Cardiac evaluation / ECG', 'Check for age-related heart changes'],
        ['Bi-annual', 'Joint assessment & mobility check', 'IVDD screening, pain management'],
        ['As needed', 'Lump/bump biopsy', 'Any new growth should be checked'],
      ]
    : [
        ['Every 6 months', 'Wellness exam + weight check', 'Body condition score assessment'],
        ['Annual', 'DHPP/rabies boosters (or titers)', 'Discuss any behavior changes'],
        ['Annual', 'Dental exam (cleaning if needed)', 'Full oral health assessment'],
        ['Annual', 'Full bloodwork panel', 'Baseline for future comparison'],
        ['As needed', 'Skin/allergy consultation', 'If chronic scratching, hot spots, etc.'],
      ];

  drawTable(
    ['When', 'Procedures', 'Notes'],
    vetSchedule,
    [34, 62, contentW - 96 > 40 ? contentW - 96 : 40],
    C.sky
  );

  // Pre-visit checklist
  y += 4;
  doc.setFontSize(11);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Pre-Visit Checklist', mx, y + 4);
  y += 10;

  const preVisitItems = [
    'Write down all questions/concerns in advance',
    'Bring current food label (photo is fine)',
    'Note any changes in appetite, energy, or behavior',
    'List all supplements and medications with dosages',
    'Bring stool sample if requested (fresh, within 12 hrs)',
    'Note last flea/tick/heartworm treatment date',
    "Bring your Frenchie's weight history (if tracking)",
    'Have vaccination records accessible (digital or paper)',
  ];

  preVisitItems.forEach((item) => {
    drawCheckItem(item, C.skyBg);
  });

  // Questions to ask your vet
  y += 6;
  ensureSpace(55);
  doc.setFillColor(...C.white);
  doc.roundedRect(mx, y, contentW, 50, 3, 3, 'F');
  doc.setDrawColor(...C.sky);
  doc.setLineWidth(0.4);
  doc.roundedRect(mx, y, contentW, 50, 3, 3, 'S');
  doc.setFillColor(...C.sky);
  doc.roundedRect(mx, y, 3, 50, 1, 1, 'F');

  doc.setFontSize(9);
  doc.setTextColor(...C.sky);
  doc.setFont('helvetica', 'bold');
  doc.text('QUESTIONS TO ASK YOUR VET', mx + 8, y + 7);

  const vetQuestions = [
    `1. Is my Frenchie at a healthy weight? (Currently scored ${answers.bodyCondition}/9)`,
    '2. Should we adjust the current diet or supplements?',
    '3. Are all vaccinations up to date, or should we do titers?',
    '4. Any breed-specific screenings recommended at this age?',
    '5. Should we evaluate BOAS severity or discuss surgery?',
    '6. What dental care schedule do you recommend?',
    '7. Are there any concerns based on today\'s exam?',
    '8. When should we schedule the next visit?',
  ];

  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  vetQuestions.forEach((q, i) => {
    doc.text(q, mx + 8, y + 14 + i * 4.5);
  });

  // Post-visit notes area
  y += 56;
  ensureSpace(28);
  doc.setFillColor(...C.offWhite);
  doc.roundedRect(mx, y, contentW, 24, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, contentW, 24, 3, 3, 'S');
  doc.setFontSize(8);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('POST-VISIT NOTES:', mx + 5, y + 7);
  // Lined area for writing
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.15);
  for (let lineY = y + 12; lineY < y + 22; lineY += 5) {
    doc.line(mx + 5, lineY, pw - mx - 5, lineY);
  }

  addFooter();

  /* ═══════════════════════════════════════════════
   * WEEKLY CARE CHECKLIST PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  drawPageTitle('Weekly Care Checklist');

  const checklistSections = [
    {
      title: 'DAILY',
      color: C.emerald,
      bg: C.emeraldBg,
      items: [
        'Fresh water bowl (change 2x daily)',
        `Feed ${answers.lifeStage === 'puppy' ? '3 meals' : '2 meals'} at consistent times`,
        'Clean facial wrinkles & nose fold',
        `${answers.activityLevel === 'active' ? '30-40' : '15-25'} min walk (avoid heat)`,
        'Check ears for redness or odor',
        'Brief teeth/gum inspection',
      ],
    },
    {
      title: 'WEEKLY',
      color: C.sky,
      bg: C.skyBg,
      items: [
        'Full body inspection (lumps, irritation)',
        'Brush coat (2-3x per week)',
        'Clean ears with vet-approved solution',
        'Trim nails if needed',
        'Wash food & water bowls thoroughly',
        'Rotate toys & enrichment activities',
      ],
    },
    {
      title: 'MONTHLY',
      color: C.violet,
      bg: C.violetBg,
      items: [
        'Weigh your Frenchie & log it',
        'Deep clean bedding & crate',
        'Flea/tick prevention treatment',
        'Dental chew or brushing routine review',
        'Review diet portions (adjust for weight)',
        'Check emergency kit supplies',
      ],
    },
  ];

  checklistSections.forEach((cls: { title: string; color: readonly [number, number, number]; bg: readonly [number, number, number]; items: string[] }) => {
    ensureSpace(50);
    doc.setFillColor(...cls.color);
    doc.roundedRect(mx, y, 32, 8, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(cls.title, mx + 16, y + 5.5, { align: 'center' });
    y += 12;

    cls.items.forEach((item) => {
      drawCheckItem(item, cls.bg);
    });
    y += 4;
  });

  addFooter();

  /* ═══════════════════════════════════════════════
   * EMERGENCY QUICK REFERENCE PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  drawPageTitle('Emergency Quick Reference', C.rose);

  const emergencies = [
    { title: 'Heatstroke', signs: 'Heavy panting, drooling, vomiting, wobbly gait', action: 'Move to shade/AC immediately. Apply cool (not cold) water to paws and belly. Rush to vet.' },
    { title: 'Choking / Breathing Crisis', signs: 'Blue tongue/gums, gagging, pawing at mouth', action: 'Check airway for obstruction. If visible, carefully remove. CPR if needed. Emergency vet immediately.' },
    { title: 'Allergic Reaction', signs: 'Swollen face/eyes, hives, difficulty breathing', action: 'Remove allergen if known. Benadryl (1mg/lb) if mild. Emergency vet if breathing is affected.' },
    { title: 'Seizure', signs: 'Uncontrolled shaking, loss of consciousness, drooling', action: 'Do NOT restrain. Clear area of hazards. Time the seizure. Vet visit within 24 hours; emergency if > 3 min.' },
    { title: 'Poisoning', signs: 'Vomiting, diarrhea, lethargy, tremors', action: 'Note what was ingested. Call ASPCA Poison Control: (888) 426-4435. Do NOT induce vomiting unless directed.' },
    { title: 'IVDD / Back Injury', signs: 'Yelping when touched, reluctance to move, dragging legs', action: 'Restrict movement immediately. Carry (do not let walk). Emergency vet -- possible spinal emergency.' },
  ];

  emergencies.forEach((em) => {
    ensureSpace(32);
    doc.setFillColor(...C.roseBg);
    doc.roundedRect(mx, y, contentW, 26, 3, 3, 'F');
    doc.setDrawColor(...C.rose);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, y, contentW, 26, 3, 3, 'S');
    doc.setFillColor(...C.rose);
    doc.roundedRect(mx, y, 3, 26, 1, 1, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...C.rose);
    doc.setFont('helvetica', 'bold');
    doc.text(em.title, mx + 7, y + 6);

    doc.setFontSize(7.5);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.text('Signs: ', mx + 7, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(em.signs, mx + 22, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('Action: ', mx + 7, y + 18);
    doc.setFont('helvetica', 'normal');
    const actionLines = doc.splitTextToSize(em.action, contentW - 28);
    doc.text(actionLines, mx + 24, y + 18);

    y += 30;
  });

  // Emergency contacts
  y += 4;
  ensureSpace(22);
  doc.setFillColor(...C.white);
  doc.roundedRect(mx, y, contentW, 20, 3, 3, 'F');
  doc.setDrawColor(...C.rose);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, contentW, 20, 3, 3, 'S');
  doc.setFontSize(8);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('EMERGENCY CONTACTS -- FILL IN AND KEEP ACCESSIBLE', mx + 5, y + 6);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text('ASPCA Poison Control: (888) 426-4435', mx + 5, y + 12);
  doc.text('Your Vet: _______________________________  |  Emergency Vet: _______________________________', mx + 5, y + 17);

  addFooter();

  /* ═══════════════════════════════════════════════
   * RESOURCES PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  drawPageTitle('Helpful Resources');

  const resources = [
    { title: 'Healthy Treats Guide', desc: 'Discover safe, nutritious treats your Frenchie will love -- including portion guidelines and homemade recipes.', url: 'frenchyfab.com/french-bulldog-healthy-treats' },
    { title: 'Complete Grooming Blueprint', desc: 'Step-by-step grooming routines tailored for French Bulldogs, from wrinkle care to nail trimming.', url: 'frenchyfab.com/french-bulldog-grooming-blueprint/' },
    { title: 'Essential Supplements Guide', desc: 'Evidence-based supplement recommendations from puppy to senior -- including dosages and top brands.', url: 'frenchyfab.com/essential-nutritional-supplements-french-bulldogs/' },
    { title: 'Best Harness for Pulling', desc: "Expert-reviewed harness picks that prevent pulling and protect your Frenchie's delicate airway.", url: 'frenchyfab.com/best-harness-for-french-bulldog-that-pulls/' },
  ];

  resources.forEach((res) => {
    ensureSpace(28);
    doc.setFillColor(...C.white);
    doc.roundedRect(mx, y, contentW, 24, 3, 3, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(mx, y, contentW, 24, 3, 3, 'S');
    doc.setFillColor(...C.terracotta);
    doc.roundedRect(mx, y, 3, 24, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...C.brown);
    doc.setFont('helvetica', 'bold');
    doc.text(res.title, mx + 7, y + 7);

    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(res.desc, contentW - 16), mx + 7, y + 13);

    doc.setTextColor(...C.terracotta);
    doc.setFontSize(7);
    doc.text(res.url, mx + 7, y + 21);
    // Make entire resource card a clickable link
    const fullResUrl = res.url.startsWith('http') ? res.url : `https://${res.url}`;
    doc.link(mx, y, contentW, 24, { url: fullResUrl });

    y += 28;
  });

  // Lifetime updates badge
  y += 8;
  ensureSpace(26);
  doc.setFillColor(...C.emeraldBg);
  doc.roundedRect(mx, y, contentW, 22, 4, 4, 'F');
  doc.setDrawColor(...C.emerald);
  doc.setLineWidth(0.4);
  doc.roundedRect(mx, y, contentW, 22, 4, 4, 'S');

  doc.setFontSize(10);
  doc.setTextColor(...C.emerald);
  doc.setFont('helvetica', 'bold');
  doc.text('LIFETIME UPDATES INCLUDED', pw / 2, y + 8, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  doc.text('Your premium plan includes free updates as our veterinary advisors add new recommendations.', pw / 2, y + 15, { align: 'center' });
  doc.text('Re-take the quiz anytime at frenchyfab.com to get refreshed, up-to-date guidance.', pw / 2, y + 20, { align: 'center' });

  addFooter();

  /* ═══════════════════════════════════════════════
   * BACK PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  doc.setFillColor(...C.cream);
  doc.rect(0, 0, pw, ph, 'F');
  pageNum++;

  doc.setFillColor(...C.brown);
  doc.rect(0, ph - 4, pw, 4, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, ph - 5.5, pw, 1.5, 'F');

  // Frenchie face image centered
  try {
    doc.addImage(faceImg, 'JPEG', pw / 2 - 22, ph / 2 - 70, 44, 44);
  } catch (e) { /* graceful fallback */ }

  doc.setFontSize(22);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank You!', pw / 2, ph / 2 - 15, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  const thankLines = doc.splitTextToSize(
    'This care plan was generated specifically for your French Bulldog based on the information you provided. For more tips, guides, and breed-specific advice, visit us online.',
    contentW - 30
  );
  doc.text(thankLines, pw / 2, ph / 2 + 2, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...C.terracotta);
  doc.setFont('helvetica', 'bold');
  doc.text('frenchyfab.com', pw / 2, ph / 2 + 28, { align: 'center' });
  // Clickable link on frenchyfab.com text
  doc.link(pw / 2 - 25, ph / 2 + 22, 50, 10, { url: 'https://frenchyfab.com' });

  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text('Follow us for daily Frenchie tips and community stories', pw / 2, ph / 2 + 38, { align: 'center' });

  // Lifetime updates reminder
  doc.setFillColor(...C.goldLight);
  doc.roundedRect(mx + 20, ph / 2 + 32, contentW - 40, 16, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Lifetime Updates Included -- Re-take the quiz anytime for fresh recommendations', pw / 2, ph / 2 + 42, { align: 'center' });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(mx, ph - 14, pw - mx, ph - 14);
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text('FrenchyFab.com  |  Your French Bulldog Care Companion', mx, ph - 9);
  doc.link(mx, ph - 13, 60, 8, { url: 'https://frenchyfab.com' });

  /* ── SAVE ── */
  doc.save('FrenchyFab-Care-Plan.pdf');
}
