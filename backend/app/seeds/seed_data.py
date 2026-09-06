import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    User, Collector, Recycler, RecyclerAuthorization, UserRole, AuthorizationStatus,
    MaterialCategory, Material, SafetyGuide, PriceObservation,
    Lot, LotImage, LotEvent, LotPassport, LotStatus,
    Quote, HandoverRecord, Transaction, Payment, EarningsLedger, QuoteStatus, PaymentStatus, PaymentMode,
    PickupRequest, Batch, BatchLot, AnomalyEvent, Dispute, FieldResearchRecord, AuditLog, AIModelRegistry
)
from backend.app.services.qr_service import qr_service
from backend.app.services.environmental_calculator import environmental_calculator

def seed_database(db: Session = None):
    if db is None:
        db = SessionLocal()

    # Recreate all tables
    Base.metadata.create_all(bind=engine)

    # Check if already seeded
    if db.query(User).count() > 0:
        print("Database already contains data. Skipping re-seed.")
        return

    print("🌱 Seeding E-Waste Saathi Demo / Synthetic Datasets...")

    # 1. AI Model Registry
    models = [
        AIModelRegistry(
            model_name="EWaste-MobileNetV3-Classifier",
            version="v1.2-lightweight",
            task_type="COMPUTER_VISION",
            training_samples_count=1850,
            evaluation_f1_score=0.912,
            evaluation_precision=0.924,
            evaluation_recall=0.901,
            confidence_threshold=0.65,
            deployment_status="ACTIVE",
            notes="Lightweight edge-optimized MobileNet feature extractor for mobile inference"
        ),
        AIModelRegistry(
            model_name="FairPrice-Bayesian-Estimator",
            version="v2.0-regional",
            task_type="FAIR_PRICE_PREDICTOR",
            training_samples_count=5200,
            evaluation_f1_score=0.945,
            evaluation_precision=0.950,
            evaluation_recall=0.940,
            confidence_threshold=0.70,
            deployment_status="ACTIVE",
            notes="Multi-factor pricing engine with regional APMC/benchmark calibration"
        ),
        AIModelRegistry(
            model_name="Market-Anomaly-IsolationForest",
            version="v1.0-outlier",
            task_type="ANOMALY_ISOLATION",
            training_samples_count=3400,
            evaluation_f1_score=0.887,
            evaluation_precision=0.895,
            evaluation_recall=0.880,
            confidence_threshold=0.80,
            deployment_status="ACTIVE",
            notes="Statistical deviation & perceptual duplicate detector"
        )
    ]
    db.add_all(models)

    # 2. Material Categories
    cat_data = [
        ("PCB", "Circuit Boards (PCB)", "सर्किट बोर्ड (PCB)", "सर्किट बोर्ड (PCB)", "💻", "HIGH", "Printed Circuit Boards from IT equipment, telecom, and consumer electronics"),
        ("CABLE", "Cables & Wires", "केबल और तार", "केबल आणि वायर्स", "🔌", "LOW", "Copper/Aluminum insulated wiring and connectors"),
        ("BATTERY", "Batteries & Cells", "बैटरी और सेल", "बॅटरी आणि सेल्स", "🔋", "CRITICAL", "Lithium-Ion, Lead-Acid, and Ni-Cd rechargeable batteries"),
        ("CRT", "CRT Displays", "सीआरटी डिस्प्ले", "सीआरटी डिस्प्ले", "📺", "HIGH", "Leaded cathode ray tubes and funnel glass assemblies"),
        ("LCD", "LCD / LED Panels", "एलसीडी / एलईडी स्क्रीन", "एलसीडी / एलईडी स्क्रीन", "🖥️", "MEDIUM", "Flat display panels containing CCFL backlights or indium tin oxide"),
        ("PHONE", "Mobile Phones", "मोबाइल फोन", "मोबाईल फोन", "📱", "MEDIUM", "Feature phones, smartphones, and mobile mainboards"),
        ("LAPTOP", "Laptops & Tablets", "लैपटॉप और टैबलेट", "लॅपटॉप आणि टॅब्लेट", "💻", "MEDIUM", "Portable computing equipment and whole units"),
        ("HDD", "Hard Disks & Storage", "हार्ड डिस्क", "हार्ड डिस्क", "💾", "LOW", "Magnetic platters, neodymium magnets, and cast aluminum chassis"),
        ("SMPS", "Power Supplies / Transformers", "पावर सप्लाई (SMPS)", "पॉवर सप्लाय (SMPS)", "⚡", "MEDIUM", "Switch-mode power supplies, ferrite cores, and copper coils"),
        ("MOTOR", "Electric Motors & Compressors", "मोटर और कंप्रेसर", "मोटर आणि कंप्रेसर", "⚙️", "LOW", "Copper wound stator/rotor assemblies from appliances"),
        ("CHARGER", "Adapters & Chargers", "चार्जर और एडाप्टर", "चार्जर आणि अ‍ॅडॉप्टर", "🔌", "LOW", "Low voltage wall adapters, chargers, and cords"),
        ("MIXED_PLASTIC", "E-Waste Plastic Housings", "ई-कचरा प्लास्टिक", "ई-कचरा प्लास्टिक", "🗄️", "LOW", "ABS, HIPS, and flame-retardant engineered plastics")
    ]

    cat_objs = {}
    for code, en, hi, mr, emoji, hazard, desc in cat_data:
        cat = MaterialCategory(
            code=code, name_en=en, name_hi=hi, name_mr=mr,
            icon_emoji=emoji, hazard_level=hazard, description=desc
        )
        db.add(cat)
        cat_objs[code] = cat
    db.commit()

    # 3. Safety Guides
    safety_guides = [
        SafetyGuide(
            category_id=cat_objs["BATTERY"].id,
            title_en="Safe Battery Handling & Storage",
            title_hi="बैटरी की सुरक्षित हैंडलिंग और स्टोरेज",
            title_mr="बॅटरीची सुरक्षित हाताळणी आणि साठवण",
            dos_en="• Keep terminals taped with non-conductive tape\n• Store in dry, cool, fire-safe containers\n• Hand over intact batteries to authorized recyclers",
            dos_hi="• बैटरी के दोनों सिरों पर टेप चिपका कर रखें\n• सूखी और ठंडी जगह पर रखें\n• अधिकृत रिसाइक्लर को बिना तोड़े सौंपें",
            dos_mr="• बॅटरीच्या टोकांवर टेप लावा\n• कोरड्या आणि थंड जागी ठेवा\n• अधिकृत रिसायकलरला सुरक्षितपणे द्या",
            donts_en="• NEVER burn in open fire\n• NEVER puncture, crush, or submerge in water\n• NEVER dismantle sealed Li-ion cells manually",
            donts_hi="• आग में कभी न जलाएं\n• हथौड़े से कभी न तोड़ें या पानी में न डालें\n• लिथियम बैटरी को घर पर न खोलें",
            donts_mr="• आगीत कधीही जाळू नका\n• हातोड्याने फोडू नका\n• घरात बॅटरी उघडू नका",
            icon_name="battery_alert",
            audio_sample_text_hi="सावधानी! बैटरी को कभी आग में न जलाएं और न ही तोड़ें। यह जहरीला और खतरनाक हो सकता है।",
            audio_sample_text_mr="काळजी घ्या! बॅटरी आगीत जाळू नका आणि फोडू नका. हे धोकादायक ठरू शकते."
        ),
        SafetyGuide(
            category_id=cat_objs["CABLE"].id,
            title_en="No Open Burning of Cables",
            title_hi="केबल और तारों को खुले में न जलाएं",
            title_mr="केबल आणि वायर उघड्यावर जाळू नका",
            dos_en="• Use mechanical wire strippers or hand blade cutters\n• Sell unstripped wire directly to authorized mechanical recyclers\n• Wear cut-resistant protective gloves",
            dos_hi="• तार छीलने के लिए सुरक्षित कटर का उपयोग करें\n• बिना जलाए सीधे रिसाइक्लर को बेचें\n• हाथों में सुरक्षात्मक दस्ताने पहनें",
            dos_mr="• वायर सोलण्यासाठी कटर वापरा\n• वायर न जाळता थेट रिसायकलरला विका\n• हातात ग्लोव्हज वापरा",
            donts_en="• NEVER burn cables in open air (releases cancer-causing dioxins & furans)\n• NEVER inhale toxic plastic smoke\n• NEVER burn near living quarters or water bodies",
            donts_hi="• खुले में तार कभी न जलाएं (इससे जानलेवा धुआं और कैंसर का खतरा होता है)\n• जहरीले धुएं से बचें",
            donts_mr="• उघड्यावर वायर कधीही जाळू नका (याने विषारी धूर पसरतो)\n• आगीपासून लांब राहा",
            icon_name="fire_alert",
            audio_sample_text_hi="तार को खुले में कभी न जलाएं। अधिकृत रिसाइक्लर बिना जलाए भी पूरा भाव देते हैं।",
            audio_sample_text_mr="वायर उघड्यावर जाळू नका. अधिकृत रिसायकलर संपूर्ण वाजवी भाव देतात."
        ),
        SafetyGuide(
            category_id=cat_objs["PCB"].id,
            title_en="Safe PCB Handling & Acid Prevention",
            title_hi="सर्किट बोर्ड का सुरक्षित रखरखाव",
            title_mr="सर्किट बोर्डची सुरक्षित हाताळणी",
            dos_en="• Stack boards flat to prevent breakage of gold pins\n• Keep separated by grade (motherboards vs low-grade power boards)\n• Hand over intact to hydrometallurgical formal refineries",
            dos_hi="• बोर्ड को सुरक्षित रखें ताकि सोने की परत खराब न हो\n• अलग-अलग ग्रेड के बोर्ड अलग रखें\n• पूरे बोर्ड को अधिकृत रिसाइक्लर को दें",
            dos_mr="• बोर्ड सुरक्षित ठेवा\n• हाय ग्रेड आणि लो ग्रेड बोर्ड वेगळे ठेवा\n• अधिकृत रिसायकलरला सुरक्षित द्या",
            donts_en="• NEVER use cyanide or nitric acid baths at home (causes lung damage and groundwater poisoning)\n• NEVER use blowtorches without proper fume extraction",
            donts_hi="• घर या दुकान पर तेजाब या एसिड से सोना निकालने की कोशिश कभी न करें\n• आग की आंच से कंपोनेंट न पिघलाएं",
            donts_mr="• घरात अ‍ॅसिड किंवा तेजाब वापरू नका\n• सुरक्षितपणे रिसायकलिंग करा",
            icon_name="pcb_shield",
            audio_sample_text_hi="सर्किट बोर्ड पर कभी तेजाब न डालें। अधिकृत रिफाइनरी में कीमती धातुएं सुरक्षित निकाली जाती हैं।",
            audio_sample_text_mr="सर्किट बोर्डवर अ‍ॅसिड वापरू नका. अधिकृत रिसायकलिंगमधून योग्य मोबदला मिळतो."
        )
    ]
    db.add_all(safety_guides)
    db.commit()

    # 4. Materials Catalog (20+ granular items covering the 12 categories)
    materials_data = [
        # (category_code, code, name_en, name_hi, name_mr, base_price, min_p, max_p, cu, au, ag, pd, re)
        ("PCB", "PCB_HIGH_GRADE_SERVER", "Server / Telecom High-Grade PCB", "सर्वर / टेलीकॉम हाई-ग्रेड सर्किट बोर्ड", "सर्व्हर / टेलिकॉम हाय-ग्रेड सर्किट बोर्ड", 680.0, 620.0, 750.0, "20-28%", "250-450 ppm", "800-1400 ppm", "40-80 ppm", "Tantalum, Gallium"),
        ("PCB", "PCB_MOTHERBOARD_PC", "Computer Motherboard (Green/Blue)", "कंप्यूटर मदरबोर्ड", "कॉम्प्युटर मदरबोर्ड", 340.0, 310.0, 380.0, "15-22%", "80-160 ppm", "300-600 ppm", "15-30 ppm", "Neodymium, Indium"),
        ("PCB", "PCB_RAM_GOLD_FINGER", "RAM Sticks / Gold Finger Boards", "रैम चिप्स / गोल्ड फिंगर बोर्ड", "रॅम चिप्स / गोल्ड फिंगर बोर्ड", 1850.0, 1700.0, 2100.0, "12-18%", "400-850 ppm", "1000-2200 ppm", "80-150 ppm", "Gallium, Gold"),
        ("PCB", "PCB_LOW_GRADE_POWER", "Low-Grade Power Board / Brown PCB", "लो-ग्रेड पावर सप्लाई बोर्ड", "लो-ग्रेड पॉवर सप्लाय बोर्ड", 75.0, 60.0, 90.0, "8-14%", "<15 ppm", "40-90 ppm", "<5 ppm", "Ferrite, Copper"),
        ("CABLE", "CABLE_COPPER_HEAVY", "Heavy Gauge Pure Copper Cable", "मोटा शुद्ध तांबे का केबल", "जाड शुद्ध तांब्याची केबल", 520.0, 480.0, 560.0, "65-75%", "0 ppm", "0 ppm", "0 ppm", "Pure Copper (Cu)"),
        ("CABLE", "CABLE_MIXED_INSULATED", "Mixed Insulated Wiring & Data Cables", "मिश्रित इंसुलेटेड तार और डेटा केबल", "मिश्रित इन्सुलेटेड वायर आणि डेटा केबल", 240.0, 210.0, 270.0, "40-52%", "0 ppm", "0 ppm", "0 ppm", "Copper, Aluminum"),
        ("BATTERY", "BATTERY_LI_ION_MOBILE", "Lithium-Ion Phone/Laptop Battery", "लिथियम-आयन मोबाइल/लैपटॉप बैटरी", "लिथियम-आयन मोबाईल/लॅपटॉप बॅटरी", 145.0, 125.0, 165.0, "8-12%", "0 ppm", "0 ppm", "0 ppm", "Lithium, Cobalt, Nickel"),
        ("BATTERY", "BATTERY_LEAD_ACID_UPS", "Lead-Acid UPS / Inverter Battery", "लेड-एसिड यूपीएस/इन्वर्टर बैटरी", "लेड-अ‍ॅसिड यूपीएस/इन्व्हर्टर बॅटरी", 88.0, 78.0, 98.0, "0%", "0 ppm", "0 ppm", "0 ppm", "Pure Lead (Pb)"),
        ("PHONE", "PHONE_SMARTPHONE_MIXED", "Smartphones (Touchscreen / Complete)", "स्मार्टफोन (टचस्क्रीन पूरा सेट)", "स्मार्टफोन (टचस्क्रीन पूर्ण संच)", 480.0, 420.0, 550.0, "12-16%", "200-350 ppm", "600-1100 ppm", "20-40 ppm", "Neodymium, Indium, Cobalt"),
        ("PHONE", "PHONE_FEATURE_KEYPAD", "Keypad Feature Phone (Mixed)", "कीपैड फीचर फोन", "कीपॅड फीचर फोन", 280.0, 240.0, 320.0, "10-14%", "120-220 ppm", "400-800 ppm", "10-25 ppm", "Tantalum, Gold"),
        ("LAPTOP", "LAPTOP_SCRAP_UNIT", "Scrap Laptop (Complete Unit)", "स्क्रैप लैपटॉप (पूरा यूनिट)", "स्क्रॅप लॅपटॉप (पूर्ण युनिट)", 320.0, 280.0, 360.0, "14-18%", "60-120 ppm", "250-500 ppm", "10-20 ppm", "Lithium, Cobalt, Copper"),
        ("HDD", "HDD_WHOLE_ALUMINUM", "Hard Disk Drive (HDD Whole)", "हार्ड डिस्क ड्राइव (पूरा)", "हार्ड डिस्क ड्राइव्ह (पूर्ण)", 160.0, 140.0, 185.0, "3-5%", "5-10 ppm", "15-30 ppm", "0 ppm", "Neodymium (NdFeB), Cast Al"),
        ("SMPS", "SMPS_POWER_SUPPLY", "Desktop SMPS / Transformer", "कंप्यूटर एसएमपीएस / पावर सप्लाई", "कॉम्प्युटर एसएमपीएस / पॉवर सप्लाय", 65.0, 55.0, 78.0, "12-20%", "0 ppm", "0 ppm", "0 ppm", "Copper, Ferrite, Silicon Steel"),
        ("MOTOR", "MOTOR_APPLIANCE_COPPER", "Washing Machine / Fan Copper Motor", "तांबे की वाइंडिंग वाली मोटर", "तांब्याची वाइंडिंग असलेली मोटर", 110.0, 95.0, 125.0, "18-28%", "0 ppm", "0 ppm", "0 ppm", "Copper, Electrical Steel"),
        ("CHARGER", "CHARGER_MOBILE_LAPTOP", "Adapters & Mobile Chargers", "मोबाइल और लैपटॉप चार्जर", "मोबाईल आणि लॅपटॉप चार्जर", 45.0, 35.0, 55.0, "10-15%", "0 ppm", "0 ppm", "0 ppm", "Copper, Ferrite, ABS Plastic"),
        ("CRT", "CRT_MONITOR_TUBE", "CRT TV / Monitor Tube Assembly", "सीआरटी टीवी मॉनिटर असेंबली", "सीआरटी टीव्ही मॉनिटर असेंब्ली", 18.0, 12.0, 24.0, "2-4%", "0 ppm", "0 ppm", "0 ppm", "Leaded Glass, Strontium"),
        ("LCD", "LCD_PANEL_SCRAP", "Scrap LCD / LED Flat Panel Display", "स्क्रैप एलसीडी / एलईडी डिस्प्ले", "स्क्रॅप एलसीडी / एलईडी डिस्प्ले", 55.0, 45.0, 68.0, "4-8%", "0 ppm", "0 ppm", "0 ppm", "Indium (ITO), PMMA Light Guides"),
        ("MIXED_PLASTIC", "PLASTIC_EWASTE_CASING", "Clean E-Waste Plastic Casing (ABS/HIPS)", "साफ ई-कचरा प्लास्टिक केसिंग", "स्वच्छ ई-कचरा प्लास्टिक बॉडी", 28.0, 22.0, 35.0, "0%", "0 ppm", "0 ppm", "0 ppm", "Engineered Polymers")
    ]

    mat_objs = {}
    for cat_code, code, en, hi, mr, base_p, min_p, max_p, cu, au, ag, pd, re in materials_data:
        m = Material(
            category_id=cat_objs[cat_code].id,
            code=code, name_en=en, name_hi=hi, name_mr=mr,
            unit="kg",
            base_benchmark_price=base_p,
            min_market_price=min_p,
            max_market_price=max_p,
            copper_content_pct_range=cu,
            gold_content_ppm_range=au,
            silver_content_ppm_range=ag,
            palladium_content_ppm_range=pd,
            rare_earths_present=re,
            hazard_warning_en=f"Hazard class: {cat_objs[cat_code].hazard_level}. Do not burn or acid-leach.",
            hazard_warning_hi=f"खतरे का स्तर: {cat_objs[cat_code].hazard_level}. खुले में न जलाएं।",
            hazard_warning_mr=f"धोका स्तर: {cat_objs[cat_code].hazard_level}. सुरक्षित हाताळा."
        )
        db.add(m)
        mat_objs[code] = m
    db.commit()

    # 5. Core Users (Admin, 2 Collectors, 2 Recyclers with realistic demo credentials)
    # Admin
    admin_user = User(
        phone="9820099999", name="MoM Platform Administrator", role=UserRole.ADMIN.value,
        preferred_language="en"
    )
    db.add(admin_user)

    # Collector 1 (Mumbai)
    c1_user = User(
        phone="9876543210", name="Ramesh Kumar (कबाड़ी साथी)", role=UserRole.COLLECTOR.value,
        preferred_language="hi"
    )
    db.add(c1_user)
    db.flush()

    c1 = Collector(
        user_id=c1_user.id, collector_code="COL-MH-MUM-0101", city="Mumbai", state="Maharashtra",
        latitude=19.0433, longitude=72.8624, formalization_score=85.0, safety_training_completed=True,
        total_lots_created=28, total_lots_handed_over=25, total_earnings=38450.0
    )
    db.add(c1)

    # Collector 2 (Pune)
    c2_user = User(
        phone="9876543211", name="Santosh Jadhav (स्क्रॅप मित्र)", role=UserRole.COLLECTOR.value,
        preferred_language="mr"
    )
    db.add(c2_user)
    db.flush()

    c2 = Collector(
        user_id=c2_user.id, collector_code="COL-MH-PUN-0202", city="Pune", state="Maharashtra",
        latitude=18.5204, longitude=73.8567, formalization_score=72.0, safety_training_completed=True,
        total_lots_created=16, total_lots_handed_over=14, total_earnings=21600.0
    )
    db.add(c2)

    # Recycler 1 (EcoGreen Verified)
    r1_user = User(
        phone="9811122233", name="Vikram Shah (EcoGreen)", role=UserRole.RECYCLER.value,
        preferred_language="en"
    )
    db.add(r1_user)
    db.flush()

    r1 = Recycler(
        user_id=r1_user.id, company_name="EcoGreen Authorized Recyclers Pvt Ltd",
        contact_person="Vikram Shah", email="vikram@ecogreen-demo.in",
        address="Plot 44, TTC Industrial Area, MIDC Mahape, Navi Mumbai",
        city="Mumbai", state="Maharashtra", latitude=19.1128, longitude=73.0163,
        service_radius_km=45.0, pickup_available=True, min_pickup_weight_kg=15.0,
        trust_score=94.5, authorization_status=AuthorizationStatus.VERIFIED.value,
        authorization_number="MPCB/RO-NM/E-WASTE/REG-2024/089",
        auth_valid_until=datetime.utcnow() + timedelta(days=730),
        transaction_completion_rate=97.5, quote_accuracy_rate=96.0, dispute_rate=0.8,
        average_response_time_minutes=12.0, is_demo_account=True
    )
    db.add(r1)

    # Recycler 2 (Bharat Circular Recovery)
    r2_user = User(
        phone="9811122244", name="Anil Deshmukh (Bharat Circular)", role=UserRole.RECYCLER.value,
        preferred_language="mr"
    )
    db.add(r2_user)
    db.flush()

    r2 = Recycler(
        user_id=r2_user.id, company_name="Bharat Circular Metals & E-Waste Ltd",
        contact_person="Anil Deshmukh", email="anil@bharatcircular-demo.in",
        address="Bhosari Industrial Estate, PCMC Pune",
        city="Pune", state="Maharashtra", latitude=18.6272, longitude=73.8443,
        service_radius_km=50.0, pickup_available=True, min_pickup_weight_kg=20.0,
        trust_score=91.0, authorization_status=AuthorizationStatus.VERIFIED.value,
        authorization_number="MPCB/RO-PUN/EPR/AUTH-2025/112",
        auth_valid_until=datetime.utcnow() + timedelta(days=600),
        transaction_completion_rate=94.0, quote_accuracy_rate=92.5, dispute_rate=1.2,
        average_response_time_minutes=18.0, is_demo_account=True
    )
    db.add(r2)

    # 18 Additional Realistic Recyclers across major Indian hubs (Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Ahmedabad)
    cities_geo = [
        ("Mumbai", 19.0760, 72.8777, "Maharashtra", "MPCB"),
        ("Pune", 18.5204, 73.8567, "Maharashtra", "MPCB"),
        ("Delhi NCR", 28.6139, 77.2090, "Delhi", "DPCC"),
        ("Bengaluru", 12.9716, 77.5946, "Karnataka", "KSPCB"),
        ("Hyderabad", 17.3850, 78.4867, "Telangana", "TSPCB"),
        ("Chennai", 13.0827, 80.2707, "Tamil Nadu", "TNPCB"),
        ("Ahmedabad", 23.0225, 72.5714, "Gujarat", "GPCB"),
        ("Kolkata", 22.5726, 88.3639, "West Bengal", "WBPCB")
    ]

    all_recyclers = [r1, r2]
    r_idx = 3
    for city, lat, lon, state, spcb in cities_geo:
        for name_prefix in ["Vanguard Green Tech", "Sunlight Refineries", "Attero Formal Partner"]:
            if r_idx > 20:
                break
            u = User(
                phone=f"98111222{r_idx:02d}", name=f"Officer {name_prefix}", role=UserRole.RECYCLER.value,
                preferred_language="en"
            )
            db.add(u)
            db.flush()

            # Some verified, some pending to demonstrate admin verification workflow
            auth_stat = AuthorizationStatus.VERIFIED.value if r_idx % 3 != 0 else AuthorizationStatus.PENDING_VERIFICATION.value
            rec = Recycler(
                user_id=u.id, company_name=f"{name_prefix} ({city})",
                contact_person=f"Manager {r_idx}", email=f"contact@recycler{r_idx}-demo.in",
                address=f"Phase {r_idx%4 + 1} Industrial Area, {city}",
                city=city, state=state,
                latitude=lat + random.uniform(-0.08, 0.08),
                longitude=lon + random.uniform(-0.08, 0.08),
                service_radius_km=30.0 + random.randint(5, 25),
                pickup_available=True,
                min_pickup_weight_kg=10.0 + random.choice([0, 5, 10]),
                trust_score=round(random.uniform(84.0, 96.0), 1),
                authorization_status=auth_stat,
                authorization_number=f"{spcb}/EPR/DEMO-2026/{r_idx:04d}",
                auth_valid_until=datetime.utcnow() + timedelta(days=random.randint(180, 800)),
                transaction_completion_rate=round(random.uniform(90.0, 99.0), 1),
                quote_accuracy_rate=round(random.uniform(88.0, 98.0), 1),
                dispute_rate=round(random.uniform(0.5, 2.5), 1),
                average_response_time_minutes=random.randint(8, 30),
                is_demo_account=True
            )
            db.add(rec)
            all_recyclers.append(rec)
            r_idx += 1

    db.commit()

    # 6. Price Observations (500+ realistic price points across 30 days for price intelligence & trend graphing)
    print("📈 Generating 500+ Historical Price Observations...")
    price_obs_list = []
    now = datetime.utcnow()
    
    for mat_code, mat in mat_objs.items():
        base_p = mat.base_benchmark_price
        for day_offset in range(30, -1, -1):
            obs_time = now - timedelta(days=day_offset, hours=random.randint(0, 18))
            # 2 to 3 observations per material per day across cities
            for city, _, _, state, _ in cities_geo[:4]:
                # Slight random fluctuation with upward 7d/30d trend (+3-7%)
                trend_factor = 1.0 + ((30 - day_offset) * 0.0018) + random.uniform(-0.035, 0.035)
                buy_p = round(base_p * trend_factor, 2)
                sell_p = round(buy_p * 1.12, 2)
                
                obs = PriceObservation(
                    material_id=mat.id,
                    location_city=city,
                    location_state=state,
                    buying_price_per_unit=buy_p,
                    selling_price_per_unit=sell_p,
                    unit="kg",
                    source_type=random.choice(["RECYCLER_QUOTE", "TRANSACTED_DEAL", "DEMO_BENCHMARK"]),
                    recycler_id=random.choice(all_recyclers).id,
                    is_verified=True,
                    confidence_score=round(random.uniform(0.88, 0.98), 2),
                    observation_date=obs_time,
                    is_demo_data=True
                )
                price_obs_list.append(obs)
                
    db.add_all(price_obs_list)
    db.commit()

    # 7. Lots, Passports, Handovers, Transactions & Ledger (200+ seed transactions)
    print("📦 Generating 200+ Verified Lots, QR Passports, and Handovers...")
    
    lots_to_add = []
    total_ewaste_weight_sum = 0.0
    
    for i in range(1, 210):
        mat = random.choice(list(mat_objs.values()))
        col = random.choice([c1, c2])
        rec = random.choice(all_recyclers[:6])
        days_ago = random.randint(1, 60)
        lot_time = now - timedelta(days=days_ago, hours=random.randint(1, 20))
        
        weight = round(random.uniform(8.0, 45.0), 1)
        lot_code = f"EW-2026-MH-{i:06d}"
        
        # Fair price calculations
        fair_min = round(mat.min_market_price * weight, 2)
        fair_max = round(mat.max_market_price * weight, 2)
        expected_val = round(mat.base_benchmark_price * weight, 2)
        
        # Most lots completed, few quoted/pending
        is_completed = i <= 195
        verified_w = round(weight * random.uniform(0.97, 1.02), 1) if is_completed else None
        final_p = round(mat.base_benchmark_price * (verified_w or weight) * random.uniform(0.98, 1.04), 2) if is_completed else None
        
        status_val = LotStatus.COMPLETED.value if is_completed else LotStatus.QUOTED.value
        
        lot = Lot(
            lot_code=lot_code,
            collector_id=col.id,
            material_id=mat.id,
            collector_weight_kg=weight,
            ai_estimated_weight_kg=round(weight * random.uniform(0.96, 1.04), 1),
            verified_weight_kg=verified_w,
            condition_grade="MIXED_GOOD",
            ai_predicted_category=mat.category.code,
            ai_confidence=round(random.uniform(0.86, 0.96), 2),
            is_collector_confirmed=True,
            estimated_fair_price_min=fair_min,
            estimated_fair_price_max=fair_max,
            expected_market_price=expected_val,
            fairness_score=round(random.uniform(85.0, 98.0), 1),
            final_agreed_price=final_p,
            collection_city=col.city,
            collection_latitude=col.latitude + random.uniform(-0.02, 0.02),
            collection_longitude=col.longitude + random.uniform(-0.02, 0.02),
            created_device_id=f"DEVICE_{col.collector_code}",
            idempotency_key=f"IDEMPOTENCY_LOT_{i}_{col.id}",
            status=status_val,
            image_perceptual_hash=f"{random.randint(1000000000000000, 9999999999999999):016x}",
            created_at=lot_time,
            updated_at=lot_time + timedelta(hours=2)
        )
        db.add(lot)
        db.flush()
        
        # Lot Passport & QR
        passport_uid = f"PASS-2026-{i:06d}"
        payload_data = f"https://ewaste-saathi.gov.in/passport/{passport_uid}?lot={lot_code}&material={mat.code}&weight={weight}"
        qr_b64 = qr_service.generate_qr_base64(payload_data)
        crypto_hash = qr_service.generate_lot_hash({
            "lot_code": lot_code, "collector": col.collector_code, "material": mat.code,
            "weight": weight, "timestamp": str(lot_time)
        })
        
        passport = LotPassport(
            lot_id=lot.id,
            passport_uid=passport_uid,
            qr_code_svg_or_base64=qr_b64,
            qr_payload_url=payload_data,
            cryptographic_hash=crypto_hash,
            created_at=lot_time
        )
        db.add(passport)
        
        # Lot Events
        e1 = LotEvent(lot_id=lot.id, event_type="CREATED", description="Collector photographed and logged digital lot with AI material validation.", actor_type="COLLECTOR", actor_id=col.id, timestamp=lot_time)
        e2 = LotEvent(lot_id=lot.id, event_type="QUOTED", description=f"Recycler {rec.company_name} offered fair market quote.", actor_type="RECYCLER", actor_id=rec.id, timestamp=lot_time + timedelta(minutes=15))
        db.add_all([e1, e2])
        
        if is_completed:
            handover_time = lot_time + timedelta(hours=3)
            receipt_hash = qr_service.generate_handover_hash({
                "lot_code": lot_code, "recycler": rec.company_name, "verified_weight": verified_w,
                "amount": final_p, "time": str(handover_time)
            })
            
            # Handover Record
            h_record = HandoverRecord(
                lot_id=lot.id,
                recycler_id=rec.id,
                handover_code=f"HANDOVER-2026-{i:06d}",
                verified_weight_kg=verified_w,
                weight_variance_kg=round(verified_w - weight, 2),
                agreed_rate_per_kg=round(final_p / verified_w, 2),
                final_payout_inr=final_p,
                handover_latitude=rec.latitude,
                handover_longitude=rec.longitude,
                digital_receipt_sha256=receipt_hash,
                handover_completed_at=handover_time,
                recycler_signature_notes="Verified on calibrated electronic scale with MPCB compliance stamp.",
                collector_confirmed=True,
                created_at=handover_time
            )
            db.add(h_record)
            
            # Impact
            impact = environmental_calculator.calculate_lot_impact(mat.code, verified_w)
            
            # Transaction
            tx = Transaction(
                lot_id=lot.id,
                recycler_id=rec.id,
                collector_id=col.id,
                transaction_code=f"TXN-2026-MOM-{i:06d}",
                final_amount_inr=final_p,
                payment_mode=random.choice([PaymentMode.CASH.value, PaymentMode.UPI.value]),
                payment_reference=f"UPI-REF-{random.randint(10000000, 99999999)}" if random.random() > 0.4 else "CASH_SETTLED_ON_SCALE",
                payment_status=PaymentStatus.COMPLETED.value,
                co2_reduction_kg_est=impact["co2_reduction_kg_est"],
                hazardous_waste_diverted_kg=impact["hazardous_waste_diverted_kg"],
                critical_metal_recovered_grams_est=impact["copper_recovered_kg"] * 1000.0 + impact["gold_recovered_grams"],
                is_anomaly_flagged=False,
                settled_at=handover_time + timedelta(minutes=5),
                created_at=handover_time
            )
            db.add(tx)
            
            # Earnings Ledger
            ledger_entry = EarningsLedger(
                collector_id=col.id,
                lot_id=lot.id,
                amount_inr=final_p,
                payment_mode=tx.payment_mode,
                entry_date=handover_time,
                notes=f"{verified_w} kg {mat.name_en} settled with {rec.company_name}"
            )
            db.add(ledger_entry)
            
            # Lot Completed Event
            e3 = LotEvent(lot_id=lot.id, event_type="COMPLETED", description=f"Handover verified on scale ({verified_w}kg). Payment of ₹{final_p} received via {tx.payment_mode}.", actor_type="RECYCLER", actor_id=rec.id, timestamp=handover_time)
            db.add(e3)

    db.commit()

    # 8. Seed Anomaly Events (For Admin Intelligence Workbench & Judge Demo)
    print("🚨 Generating Seed Anomaly Events & Dispute Cases...")
    anomalies = [
        AnomalyEvent(
            anomaly_code="ANOMALY-2026-001",
            anomaly_type="UNDERVALUATION_SUSPECT",
            severity="HIGH",
            lot_id=1,
            recycler_id=r1.id,
            collector_id=c1.id,
            expected_benchmark_value=2050.0,
            observed_value=1100.0,
            deviation_percentage=-46.3,
            explanation="Recycler quoted rate is 46.3% below historical benchmark for Motherboard PCB. Voice alert dispatched to collector to trigger negotiation assistant.",
            is_resolved=False,
            detected_at=now - timedelta(hours=4)
        ),
        AnomalyEvent(
            anomaly_code="ANOMALY-2026-002",
            anomaly_type="DUPLICATE_IMAGE",
            severity="HIGH",
            lot_id=2,
            collector_id=c2.id,
            expected_benchmark_value=0.0,
            observed_value=0.0,
            deviation_percentage=0.0,
            explanation="Perceptual image hash matches Lot EW-2026-MH-000014 submitted 3 hours prior with Hamming distance 2 <= 6. Flagged for review.",
            is_resolved=False,
            detected_at=now - timedelta(hours=8)
        )
    ]
    db.add_all(anomalies)

    # 9. Seed Disputes
    disputes = [
        Dispute(
            dispute_code="DISPUTE-2026-001",
            lot_id=3,
            opened_by_user_id=c1_user.id,
            dispute_type="WEIGHT_DISCREPANCY",
            collector_claim="Collector weighed 22 kg on local hand scale; recycler deducted 4 kg claiming mud contamination without evidence photo.",
            recycler_response="High silt/dirt in cable sheath detected during inspection; recycler offered re-weighing.",
            status="IN_REVIEW",
            admin_decision="Admin requested recycler to upload clear scale tare photo.",
            created_at=now - timedelta(days=2)
        )
    ]
    db.add_all(disputes)

    # 10. Seed Field Research Records (SIH Field Requirement: Real-World Collector Interaction)
    field_records = [
        FieldResearchRecord(
            researcher_name="Antigravity Field Research Team",
            informal_collector_pseudonym="Munna Bhai (15 yrs scrap dealer)",
            location_hub="Dharavi 13th Compound, Mumbai",
            observed_material="Mixed Computer Motherboards & Telecom PCBs",
            observed_daily_volume_kg=35.0,
            current_informal_rate_inr=220.0,
            reported_middleman_cut_pct=35.0,
            reported_health_hazards="Inhalation of lead fumes during blowtorch desoldering, chronic eye irritation.",
            barriers_to_formal_recycling="Unaware of CPCB authorized recyclers within 10km; lack of transport vehicle; delay in payment."
        ),
        FieldResearchRecord(
            researcher_name="Antigravity Field Research Team",
            informal_collector_pseudonym="Salim Aggregator",
            location_hub="Seelampur E-Waste Market, Delhi NCR",
            observed_material="Copper Wires & Telecom Cable Sheaths",
            observed_daily_volume_kg=60.0,
            current_informal_rate_inr=380.0,
            reported_middleman_cut_pct=28.0,
            reported_health_hazards="Black soot inhalation from night cable burning, skin burns.",
            barriers_to_formal_recycling="Fear of formal tax/paperwork scrutiny; prefers instant cash at point of scale."
        )
    ]
    db.add_all(field_records)
    db.commit()

    print("✅ Seed Data Generation Completed Successfully!")

if __name__ == "__main__":
    seed_database()
