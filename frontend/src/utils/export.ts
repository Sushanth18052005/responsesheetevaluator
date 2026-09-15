import type { EvaluationResult, EvaluationSummary, QuestionResult, CDNResponse, SectionSummary } from '../types'

export function exportCSV(questions: QuestionResult[], summary: EvaluationSummary, sections?: SectionSummary[]) {
  const header = 'Question,Section,Correct Answer,Candidate Response,Result,Marks'
  const rows = questions.map(q =>
    `${q.question_number},${q.section ?? ''},${q.correct_answer ?? ''},${q.candidate_response ?? ''},${q.result},${q.marks}`
  )
  rows.push('')
  rows.push(`Total Questions,${summary.total_questions}`)
  rows.push(`Attempted,${summary.attempted}`)
  rows.push(`Correct,${summary.correct}`)
  rows.push(`Wrong,${summary.wrong}`)
  rows.push(`Unanswered,${summary.unanswered}`)
  rows.push(`Score,${summary.score} / ${summary.maximum_score}`)
  rows.push(`Percentage,${summary.percentage}%`)
  rows.push(`Accuracy,${summary.accuracy}%`)

  if (sections && sections.length > 1) {
    rows.push('')
    rows.push('Section-wise Breakdown')
    rows.push('Section,Total,Correct,Wrong,Unanswered,Score,Percentage')
    sections.forEach(s => {
      rows.push(`${s.section},${s.total},${s.correct},${s.wrong},${s.unanswered},${s.score},${s.percentage}%`)
    })
  }

  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'evaluation-results.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function exportPDF(
  result: EvaluationResult,
  sheet: CDNResponse | null,
) {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    let y = 15

    const addFooter = () => {
      const pages = doc.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text('Made by P. Sushanth Reddy', pw / 2, ph - 8, { align: 'center' })
        doc.text(`Page ${i} of ${pages}`, pw - 15, ph - 8, { align: 'right' })
      }
    }

    // Title
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pw, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('CDN Response Sheet Evaluator', pw / 2, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Scorecard', pw / 2, 19, { align: 'center' })
    y = 35

    // Candidate info
    doc.setTextColor(0, 0, 0)
    if (sheet) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Candidate Information', 15, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const info: [string, string][] = [
        ['CDN ID', sheet.cdn_id],
        ['Name', sheet.candidate_name || 'N/A'],
        ['Candidate ID', sheet.candidate_id || 'N/A'],
        ['Exam', sheet.exam_name || 'N/A'],
        ['Date', sheet.exam_date || 'N/A'],
        ['Subject', sheet.subject || 'N/A'],
      ]
      info.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(`${label}:`, 15, y)
        doc.setFont('helvetica', 'normal')
        doc.text(val, 55, y)
        y += 5
      })
      y += 4
    }

    // Summary
    const s = result.summary
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Performance Summary', 15, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const stats: [string, string][] = [
      ['Total Questions', `${s.total_questions}`],
      ['Attempted', `${s.attempted}`],
      ['Correct', `${s.correct}`],
      ['Wrong', `${s.wrong}`],
      ['Unanswered', `${s.unanswered}`],
      ['Score', `${s.score} / ${s.maximum_score}`],
      ['Percentage', `${s.percentage.toFixed(1)}%`],
      ['Accuracy', `${s.accuracy.toFixed(1)}%`],
    ]
    stats.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${label}:`, 15, y)
      doc.setFont('helvetica', 'normal')
      doc.text(val, 55, y)
      y += 5
    })
    y += 4

    // Section breakdown
    if (result.section_summaries.length > 1) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Section-wise Breakdown', 15, y)
      y += 6
      doc.setFontSize(8)
      result.section_summaries.forEach(sec => {
        if (y > ph - 20) { doc.addPage(); y = 15 }
        doc.setFont('helvetica', 'bold')
        doc.text(sec.section, 15, y)
        doc.setFont('helvetica', 'normal')
        doc.text(`${sec.correct}/${sec.total} correct  |  Score: ${sec.score}  |  ${sec.percentage.toFixed(1)}%`, 70, y)
        y += 5
      })
      y += 4
    }

    // Question table
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Question-wise Results', 15, y)
    y += 6

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(241, 245, 249)
    doc.rect(15, y - 4, pw - 30, 6, 'F')
    doc.setTextColor(71, 85, 105)
    doc.text('Q#', 17, y)
    doc.text('Key', 35, y)
    doc.text('Response', 55, y)
    doc.text('Result', 85, y)
    doc.text('Marks', 125, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    result.questions.forEach((q) => {
      if (y > ph - 20) {
        doc.addPage()
        y = 15
      }
      if (q.result === 'Correct') doc.setTextColor(22, 163, 74)
      else if (q.result === 'Wrong') doc.setTextColor(220, 38, 38)
      else doc.setTextColor(100, 116, 139)

      doc.text(`${q.question_number}`, 17, y)
      doc.text(q.correct_answer ?? '-', 35, y)
      doc.text(q.candidate_response ?? '-', 55, y)
      doc.text(q.result, 85, y)
      doc.text(`${q.marks > 0 ? '+' : ''}${q.marks}`, 125, y)
      y += 5
    })

    doc.setTextColor(0, 0, 0)
    addFooter()
    doc.save('scorecard.pdf')
  })
}
