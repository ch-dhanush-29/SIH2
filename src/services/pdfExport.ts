import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChipData, EvaluationMetrics, LotStatistics, ParameterType, PARAMETER_CONFIGS } from '../types/burnIn';

export function exportSinglePartQAPdf(
  chip: ChipData,
  stats: LotStatistics | null,
  parameter: ParameterType
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pcfg = PARAMETER_CONFIGS[parameter];
  const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Background Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // Title
  doc.setTextColor(0, 240, 255); // Cyan
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BURNWATCH 3D - QA SCREENING CERTIFICATE', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.text(`AI-Driven Burn-In & Thermal Screening • Document Ref: QA-CERT-${chip.part_id}`, 14, 25);
  doc.text(`Generated: ${dateStr} UTC • Chamber Target: 125.0°C (N2 Purge)`, 14, 31);

  // Component Information Grid
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. COMPONENT IDENTIFICATION & METRICS', 14, 48);

  autoTable(doc, {
    startY: 52,
    head: [['Attribute', 'Value', 'Reference Spec / Lot Baseline']],
    body: [
      ['Component Part ID', chip.part_id, 'Traceable serialized flight package'],
      ['Lot Identifier', chip.lot_id, stats?.lotId || 'Lot-01'],
      ['Ground Truth Class', chip.groundTruth, 'Certified lab verification'],
      ['Current Reading (24h)', `${chip.measurements[parameter].v_24h} ${pcfg.unit}`, `Lot Median: ${stats?.median.toFixed(2)} ${pcfg.unit}`],
      ['Datasheet Static Limit', `${pcfg.staticLimit} ${pcfg.unit}`, chip.passesStaticLimit ? 'PASS (Under Ceiling)' : 'FAIL (Exceeds Limit)'],
      ['Lot Robust Z-Score', `${chip.robustZScore} σ`, 'Safety threshold: < 2.50 σ'],
      ['Early Drift Rate (0h-24h)', `${chip.predictedSlope.toFixed(4)} ${pcfg.unit}/h`, `Lot Safety Slope: ${stats?.safetySlope.toFixed(4)} ${pcfg.unit}/h`],
      ['Forecast 168h Value', `${chip.predicted168h} ${pcfg.unit}`, `95% CI: [${chip.predictionInterval[0]} - ${chip.predictionInterval[1]}]`],
      ['Early Reject Flag (24h)', chip.earlyReject ? 'YES (Triggered at 24h)' : 'NO', `${chip.timeSavedHours} Chamber Hours Saved`],
      ['Final Screening Verdict', chip.verdict, chip.verdict === 'PASS' ? 'FLIGHT APPROVED' : 'SCREENING REJECT'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.2 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Plain-English Justification Box
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. GLASS-BOX EXPLAINABLE AI VERDICT', 14, finalY);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY + 4, 182, 28, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(51, 65, 85);
  const splitText = doc.splitTextToSize(`Justification: "${chip.justification}"`, 174);
  doc.text(splitText, 18, finalY + 11);

  // SHAP Feature Importance Table
  const shapY = finalY + 38;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('3. SHAP FEATURE ATTRIBUTION ANALYSIS', 14, shapY);

  autoTable(doc, {
    startY: shapY + 4,
    head: [['Feature', 'SHAP Impact Score', 'Physical Rationale']],
    body: chip.shapAttributions.map((s) => [
      s.feature,
      s.value > 0 ? `+${s.value}` : `${s.value}`,
      s.description,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    styles: { fontSize: 8 },
  });

  // QA Sign-off Block
  const signY = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('QA INSPECTOR AUTHORIZATION', 14, signY);
  doc.setFont('helvetica', 'normal');
  doc.text('Lead Screening Engineer: _________________________', 14, signY + 8);
  doc.text('Signature & Seal: _________________________________', 120, signY + 8);
  doc.text('Smart India Hackathon 2024 / BurnWatch 3D Automated QA Module', 14, signY + 16);

  doc.save(`QA_Report_${chip.part_id}.pdf`);
}

export function exportLotSummaryQAPdf(
  lotStats: LotStatistics | null,
  metrics: EvaluationMetrics | null,
  chips: ChipData[],
  parameter: ParameterType
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pcfg = PARAMETER_CONFIGS[parameter];
  const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(0, 240, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BURNWATCH 3D - BATCH LOT SCREENING AUDIT', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`Lot Batch: ${lotStats?.lotId || 'LOT-ALPHA'} • Total Tested: ${chips.length} IC Units`, 14, 25);
  doc.text(`Generated: ${dateStr} UTC • Thermal Profile: 125°C Arrhenius Accelerated`, 14, 31);

  // Summary Metrics Table
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. BATCH SCREENING PERFORMANCE (SIH METRICS)', 14, 48);

  autoTable(doc, {
    startY: 52,
    head: [['Key Metric', 'Performance Result', 'Aerospace Screening Target']],
    body: [
      ['Recall (Anomaly Capture Rate)', `${metrics?.recall.toFixed(1)}%`, '100.0% (Zero Escape Tolerance)'],
      ['Escaped Defects (False Negatives)', `${metrics?.escapedDefects}`, 'MUST BE 0 (Catastrophic)'],
      ['Precision', `${metrics?.precision.toFixed(1)}%`, '> 85.0%'],
      ['Recall-Weighted F2 Score', `${metrics?.f2Score.toFixed(1)}%`, '> 90.0%'],
      ['168h Forecast MAE', `${metrics?.mae168h} ${pcfg.unit}`, `< 1.5 ${pcfg.unit}`],
      ['Risk-Weighted Cost Penalty', `$${metrics?.costPenalty}`, 'Zero Flight Catastrophe Cost ($1000/FN)'],
      ['Lot Median / Robust MAD', `${lotStats?.median.toFixed(2)} / ${lotStats?.mad.toFixed(2)} ${pcfg.unit}`, 'Statistical Stability'],
      ['Dynamic Lot Limit vs Static Limit', `${lotStats?.dynamicUpperLimit.toFixed(2)} vs ${pcfg.staticLimit} ${pcfg.unit}`, 'Dynamic bounds prevent latent defects'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.2 },
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. ANOMALOUS COMPONENTS FLAGGED', 14, nextY);

  const flagged = chips.filter((c) => c.verdict !== 'PASS');

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Part ID', 'Verdict', 'Value (24h)', 'Robust Z', 'Early Drift Slope', 'Early Reject (24h)']],
    body: flagged.map((c) => [
      c.part_id,
      c.verdict,
      `${c.measurements[parameter].v_24h} ${pcfg.unit}`,
      `${c.robustZScore} σ`,
      `${c.predictedSlope.toFixed(4)} ${pcfg.unit}/h`,
      c.earlyReject ? 'YES (144h saved)' : 'NO',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [225, 29, 72], textColor: 255 },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
  });

  doc.save(`Lot_Screening_Audit_${lotStats?.lotId || 'Summary'}.pdf`);
}
