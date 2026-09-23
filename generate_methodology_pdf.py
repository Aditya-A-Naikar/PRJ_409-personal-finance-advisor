from reportlab.lib.pagesizes import A4, portrait
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf(filename="PRJ_409_Methodology_Architecture_Table.pdf"):
    # Clean single-page portrait layout
    doc = SimpleDocTemplate(
        filename,
        pagesize=portrait(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=3,
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=14,
    )

    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.white,
    )

    cell_comp = ParagraphStyle(
        'CellComp',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A'),
    )

    cell_method = ParagraphStyle(
        'CellMethod',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#1E293B'),
    )

    story = []

    story.append(Paragraph("PRJ_409: AI Personal Finance Advisor", title_style))
    story.append(Paragraph("System Modules & Primary Methods / Algorithms Used", subtitle_style))

    headers = [
        Paragraph("<b>Module / Component</b>", th_style),
        Paragraph("<b>Primary Method & Algorithm Used</b>", th_style),
    ]

    data = [
        [
            "1. Transaction Categorization",
            "TF-IDF Vectorization + Logistic Regression Classifier (with Rule-Based regex fallback)"
        ],
        [
            "2. Budget Recommendation Engine",
            "Rolling Historical Moving Average"
        ],
        [
            "3. Goal Feasibility Engine",
            "Amortized Capital Allocation & Liquidity Constraint Verification"
        ],
        [
            "4. Recurring Cost & Anomaly Detector",
            "Cadence Clustering & Percentage Drift Scoring"
        ],
        [
            "5. Affordability Calculator",
            "Multi-Factor Liquidity & Capital Preservation Analysis"
        ],
        [
            "6. AI Advisor & Chatbot",
            "23-Intent NLP Classifier with Dynamic State-Bound Formula Simulation"
        ],
        [
            "7. Financial Rule-Based Insights",
            "Heuristic Statistical Analysis (Pareto 80/20 & Velocity Growth)"
        ],
        [
            "8. Retirement & Inflation Projections",
            "Compounded Future Value & Trinity 4% Safe Withdrawal Rule"
        ],
        [
            "9. Authentication & Security",
            "OAuth2 Password Bearer Flow + JWT (HMAC-SHA256) + Argon2/Bcrypt"
        ],
    ]

    table_data = [headers]
    for row in data:
        table_data.append([
            Paragraph(row[0], cell_comp),
            Paragraph(row[1], cell_method),
        ])

    # Printable width: 595.28 - 72 = 523.28
    col_widths = [190, 333]

    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
    ]

    for i in range(1, len(table_data)):
        bg = colors.HexColor('#F8FAFC') if i % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, i), (-1, i), bg))

    t.setStyle(TableStyle(t_style))
    story.append(t)

    doc.build(story)
    print(f"PDF generated successfully at: {filename}")

if __name__ == "__main__":
    generate_pdf()
