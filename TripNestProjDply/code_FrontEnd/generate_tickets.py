import os

def create_pdf(filepath, stream_commands):
    content = "\n".join(stream_commands).encode("latin-1")
    content_len = len(content)
    
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        f"<< /Length {content_len} >>\nstream\n".encode("latin-1") + content + b"\nendstream"
    ]
    
    out = bytearray()
    out.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode("latin-1"))
        out.extend(obj)
        out.extend(b"\nendobj\n")
        
    xref_offset = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets:
        out.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
        
    out.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("latin-1"))
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(out)
    print(f"Generated: {filepath} ({len(out)} bytes)")

def esc(text):
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

def rect(x, y, w, h, r, g, b, stroke=False, sr=0, sg=0, sb=0, lw=1):
    ops = [f"{r:.3f} {g:.3f} {b:.3f} rg"]
    if stroke:
        ops.append(f"{sr:.3f} {sg:.3f} {sb:.3f} RG {lw} w")
        ops.append(f"{x} {y} {w} {h} re B")
    else:
        ops.append(f"{x} {y} {w} {h} re f")
    return "\n".join(ops)

def line(x1, y1, x2, y2, r=0.8, g=0.8, b=0.8, w=1, dashed=False):
    ops = [f"{r:.3f} {g:.3f} {b:.3f} RG {w} w"]
    if dashed:
        ops.append("[4 4] 0 d")
    else:
        ops.append("[] 0 d")
    ops.append(f"{x1} {y1} m {x2} {y2} l S")
    ops.append("[] 0 d")
    return "\n".join(ops)

def text(x, y, font, size, s, r=0.1, g=0.1, b=0.1):
    return f"{r:.3f} {g:.3f} {b:.3f} rg BT /{font} {size} Tf {x} {y} Td ({esc(s)}) Tj ET"

# ==============================================================================
# 1. PLANE TICKET (Flight Boarding Pass)
# ==============================================================================
def generate_plane_ticket(filepath):
    ops = []
    # Background subtle canvas
    ops.append(rect(0, 0, 612, 792, 0.96, 0.97, 0.99))
    
    # Outer Card (x=40, y=360, w=532, h=370)
    card_x, card_y, card_w, card_h = 40, 360, 532, 370
    ops.append(rect(card_x, card_y, card_w, card_h, 1, 1, 1, stroke=True, sr=0.82, sg=0.85, sb=0.92, lw=1.5))
    
    # Header Banner - Sapphire Blue
    ops.append(rect(card_x, card_y + card_h - 75, card_w, 75, 0.12, 0.35, 0.85))
    ops.append(text(card_x + 25, card_y + card_h - 35, "F2", 20, "TripNest Airways - Boarding Pass", 1, 1, 1))
    ops.append(text(card_x + 25, card_y + card_h - 58, "F1", 11, "ELECTRONIC FLIGHT TICKET / CONFIRMED BOOKING", 0.85, 0.92, 1))
    ops.append(text(card_x + card_w - 140, card_y + card_h - 45, "F2", 15, "INDIGO 6E-204", 1, 0.9, 0.3))
    
    # Route Banner
    ops.append(rect(card_x + 20, card_y + card_h - 135, card_w - 40, 50, 0.94, 0.96, 1.0))
    ops.append(text(card_x + 40, card_y + card_h - 110, "F2", 18, "BLR", 0.1, 0.2, 0.5))
    ops.append(text(card_x + 40, card_y + card_h - 126, "F1", 9, "Bengaluru Kempegowda Intl", 0.4, 0.4, 0.5))
    
    ops.append(text(card_x + 230, card_y + card_h - 110, "F2", 14, "------> 1h 20m ------>", 0.3, 0.5, 0.8))
    
    ops.append(text(card_x + card_w - 110, card_y + card_h - 110, "F2", 18, "GOI", 0.1, 0.2, 0.5))
    ops.append(text(card_x + card_w - 140, card_y + card_h - 126, "F1", 9, "Goa Dabolim Airport", 0.4, 0.4, 0.5))
    
    # Passenger Details Row
    y_row1 = card_y + card_h - 175
    ops.append(text(card_x + 30, y_row1 + 14, "F1", 9, "PASSENGER NAME", 0.5, 0.5, 0.6))
    ops.append(text(card_x + 30, y_row1 - 2, "F2", 13, "SHREYAS H M", 0.1, 0.1, 0.2))
    
    ops.append(text(card_x + 220, y_row1 + 14, "F1", 9, "PNR / BOOKING REF", 0.5, 0.5, 0.6))
    ops.append(text(card_x + 220, y_row1 - 2, "F2", 13, "TN9482A", 0.12, 0.35, 0.85))
    
    ops.append(text(card_x + 380, y_row1 + 14, "F1", 9, "FLIGHT DATE", 0.5, 0.5, 0.6))
    ops.append(text(card_x + 380, y_row1 - 2, "F2", 13, "15 OCT 2026", 0.1, 0.1, 0.2))
    
    # Flight Key Metrics Boxes (Gate, Boarding, Seat, Class)
    y_boxes = card_y + card_h - 260
    box_w = (card_w - 70) / 4
    metrics = [
        ("GATE", "4B", 0.1, 0.4, 0.8),
        ("BOARDING", "06:15 AM", 0.8, 0.2, 0.1),
        ("SEAT", "12F (Win)", 0.05, 0.6, 0.3),
        ("CLASS", "ECONOMY", 0.4, 0.2, 0.7)
    ]
    for idx, (label, val, r, g, b) in enumerate(metrics):
        bx = card_x + 20 + idx * (box_w + 10)
        ops.append(rect(bx, y_boxes, box_w, 55, 0.97, 0.98, 1, stroke=True, sr=0.85, sg=0.88, sb=0.95))
        ops.append(text(bx + 12, y_boxes + 36, "F1", 8, label, 0.5, 0.5, 0.6))
        ops.append(text(bx + 12, y_boxes + 15, "F2", 13, val, r, g, b))
        
    # Perforated / Dashed line divider
    ops.append(line(card_x + 15, card_y + 80, card_x + card_w - 15, card_y + 80, 0.75, 0.78, 0.85, w=1.5, dashed=True))
    
    # Bottom Barcode & Instructions
    ops.append(text(card_x + 30, card_y + 50, "F1", 9, "Baggage: 15kg Check-in + 7kg Cabin | Terminal 2 | Please carry valid Photo ID", 0.4, 0.4, 0.5))
    ops.append(text(card_x + 30, card_y + 30, "F1", 8, "Verification Code: ||| | |||| || ||| ||||| |||| || |||||| | |||||| || | |||| ||", 0.2, 0.2, 0.3))
    ops.append(text(card_x + card_w - 160, card_y + 30, "F2", 10, "STATUS: CONFIRMED", 0.05, 0.6, 0.3))
    
    # Notes below ticket card
    ops.append(text(45, 320, "F2", 12, "Sample Flight E-Ticket Document for TripNest Vault Testing", 0.2, 0.2, 0.3))
    ops.append(text(45, 300, "F1", 10, "- Category: TICKET / FLIGHT", 0.4, 0.4, 0.4))
    ops.append(text(45, 285, "F1", 10, "- Formats supported: PDF, PNG, JPG up to 10 MB", 0.4, 0.4, 0.4))
    ops.append(text(45, 270, "F1", 10, "- Use in DocumentVaultTab.jsx to test Upload, In-Browser Preview, Download, and Delete.", 0.4, 0.4, 0.4))

    create_pdf(filepath, ops)

# ==============================================================================
# 2. TRAIN TICKET (IRCTC E-Reservation Slip)
# ==============================================================================
def generate_train_ticket(filepath):
    ops = []
    # Subtle background
    ops.append(rect(0, 0, 612, 792, 0.98, 0.97, 0.95))
    
    # Outer Card (x=40, y=360, w=532, h=370)
    card_x, card_y, card_w, card_h = 40, 360, 532, 370
    ops.append(rect(card_x, card_y, card_w, card_h, 1, 1, 1, stroke=True, sr=0.88, sg=0.82, sb=0.75, lw=1.5))
    
    # Header Banner - IRCTC Crimson / Forest Green
    ops.append(rect(card_x, card_y + card_h - 75, card_w, 75, 0.02, 0.45, 0.35))
    ops.append(text(card_x + 25, card_y + card_h - 35, "F2", 19, "Indian Railways - IRCTC E-Ticket", 1, 1, 1))
    ops.append(text(card_x + 25, card_y + card_h - 58, "F1", 11, "ELECTRONIC RESERVATION SLIP (ERS) / VALID WITH ID", 0.85, 0.98, 0.92))
    ops.append(text(card_x + card_w - 170, card_y + card_h - 45, "F2", 14, "TRAIN: 12007 SHATABDI", 1, 0.95, 0.4))
    
    # Route Banner
    ops.append(rect(card_x + 20, card_y + card_h - 135, card_w - 40, 50, 0.95, 0.98, 0.96))
    ops.append(text(card_x + 40, card_y + card_h - 110, "F2", 18, "MAS (Chennai Central)", 0.05, 0.35, 0.25))
    ops.append(text(card_x + 40, card_y + card_h - 126, "F1", 9, "Departure: 06:00 AM | Platform: 2", 0.4, 0.5, 0.4))
    
    ops.append(text(card_x + 230, card_y + card_h - 110, "F2", 13, "---- 5 hrs 00 mins ---->", 0.2, 0.5, 0.3))
    
    ops.append(text(card_x + card_w - 160, card_y + card_h - 110, "F2", 18, "SBC (Bengaluru City)", 0.05, 0.35, 0.25))
    ops.append(text(card_x + card_w - 160, card_y + card_h - 126, "F1", 9, "Arrival: 11:00 AM | Platform: 1", 0.4, 0.5, 0.4))
    
    # Passenger Details Row
    y_row1 = card_y + card_h - 175
    ops.append(text(card_x + 30, y_row1 + 14, "F1", 9, "PASSENGER NAME", 0.5, 0.5, 0.5))
    ops.append(text(card_x + 30, y_row1 - 2, "F2", 13, "SHREYAS H M (Age: 23, Male)", 0.1, 0.2, 0.1))
    
    ops.append(text(card_x + 225, y_row1 + 14, "F1", 9, "PNR NUMBER", 0.5, 0.5, 0.5))
    ops.append(text(card_x + 225, y_row1 - 2, "F2", 13, "452-9817263", 0.02, 0.45, 0.35))
    
    ops.append(text(card_x + 380, y_row1 + 14, "F1", 9, "TRAVEL DATE", 0.5, 0.5, 0.5))
    ops.append(text(card_x + 380, y_row1 - 2, "F2", 13, "18 OCT 2026", 0.1, 0.2, 0.1))
    
    # Train Metrics Boxes (Coach, Seat, Quota, Fare)
    y_boxes = card_y + card_h - 260
    box_w = (card_w - 70) / 4
    train_metrics = [
        ("COACH", "C2", 0.02, 0.45, 0.35),
        ("BERTH / SEAT", "45 (Window)", 0.1, 0.3, 0.8),
        ("CLASS / QUOTA", "AC Chair (GN)", 0.7, 0.3, 0.1),
        ("TOTAL FARE", "INR 985.00", 0.2, 0.6, 0.2)
    ]
    for idx, (label, val, r, g, b) in enumerate(train_metrics):
        bx = card_x + 20 + idx * (box_w + 10)
        ops.append(rect(bx, y_boxes, box_w, 55, 0.98, 0.99, 0.98, stroke=True, sr=0.85, sg=0.90, sb=0.85))
        ops.append(text(bx + 10, y_boxes + 36, "F1", 8, label, 0.5, 0.5, 0.5))
        ops.append(text(bx + 10, y_boxes + 15, "F2", 12, val, r, g, b))
        
    # Perforated line
    ops.append(line(card_x + 15, card_y + 80, card_x + card_w - 15, card_y + 80, 0.8, 0.8, 0.7, w=1.5, dashed=True))
    
    # Bottom Info
    ops.append(text(card_x + 30, card_y + 50, "F1", 9, "Meals: Breakfast Included | Catering Opted: YES | Standard Cancellation rules apply", 0.4, 0.4, 0.4))
    ops.append(text(card_x + 30, card_y + 30, "F1", 8, "QR / IRCTC Security Key: ||||| || |||||| | |||| ||||| || |||| | |||||| || | |||||", 0.2, 0.2, 0.2))
    ops.append(text(card_x + card_w - 160, card_y + 30, "F2", 10, "BOOKING STATUS: CNF", 0.02, 0.55, 0.25))
    
    # Notes below ticket card
    ops.append(text(45, 320, "F2", 12, "Sample Train E-Reservation Slip for TripNest Vault Testing", 0.2, 0.2, 0.3))
    ops.append(text(45, 300, "F1", 10, "- Category: TICKET / TRAIN", 0.4, 0.4, 0.4))
    ops.append(text(45, 285, "F1", 10, "- Valid Indian Railways ERS ticket structure simulation", 0.4, 0.4, 0.4))
    ops.append(text(45, 270, "F1", 10, "- Ready to drag and drop into DocumentVaultTab.jsx", 0.4, 0.4, 0.4))

    create_pdf(filepath, ops)

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(base_dir, "public")
    sample_dir = os.path.join(base_dir, "sample_tickets")
    
    # Generate in public/ for browser direct download
    generate_plane_ticket(os.path.join(public_dir, "sample_plane_ticket.pdf"))
    generate_train_ticket(os.path.join(public_dir, "sample_train_ticket.pdf"))
    
    # Also generate in sample_tickets/ for easy local drag-and-drop
    generate_plane_ticket(os.path.join(sample_dir, "sample_plane_ticket.pdf"))
    generate_train_ticket(os.path.join(sample_dir, "sample_train_ticket.pdf"))
