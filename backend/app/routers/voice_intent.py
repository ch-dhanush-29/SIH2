from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(prefix="/voice", tags=["Voice Assistant (Bolkar Chalao)"])

class VoiceIntentRequest(BaseModel):
    transcript: str
    language: str = "hi" # hi, mr, en

class VoiceIntentResponse(BaseModel):
    intent: str # SELL_EWASTE, CHECK_PRICE, FIND_RECYCLER, MY_EARNINGS, SAFETY_HELP, CONFIRM, UNKNOWN
    target_category_code: Optional[str] = None
    extracted_weight_kg: Optional[float] = None
    response_speech_hi: str
    response_speech_mr: str
    response_speech_en: str
    navigation_route: str

@router.post("/intent", response_model=VoiceIntentResponse)
def parse_voice_intent(req: VoiceIntentRequest):
    text = req.transcript.lower().strip()
    
    # 1. Price queries
    if any(k in text for k in ["rate", "bhav", "bhaav", "price", "kitna", "kimat", "दर", "भाव", "किंमत", "दाम"]):
        cat = "PCB"
        if "cable" in text or "tar" in text or "taar" in text or "तार" in text or "केबल" in text:
            cat = "CABLE"
        elif "battery" in text or "battery" in text or "बैटरी" in text or "बॅटरी" in text:
            cat = "BATTERY"
        elif "phone" in text or "mobile" in text or "फोन" in text or "मोबाईल" in text:
            cat = "PHONE"
            
        return VoiceIntentResponse(
            intent="CHECK_PRICE",
            target_category_code=cat,
            response_speech_hi=f"आज का बाजार भाव खोला जा रहा है। सर्किट बोर्ड लगभग ₹340 प्रति किलो चल रहा है।",
            response_speech_mr=f"आजचे बाजारभाव उघडत आहे. सर्किट बोर्ड सुमारे ₹340 प्रति किलो आहे.",
            response_speech_en="Opening today's price board.",
            navigation_route="#prices"
        )
        
    # 2. Sell / Lot creation
    elif any(k in text for k in ["sell", "bechna", "becho", "vikaycha", "vikayche", "photo", "bech", "बेचना", "विका", "फोटो"]):
        return VoiceIntentResponse(
            intent="SELL_EWASTE",
            response_speech_hi="ई-कचरे का फोटो खींचने के लिए कैमरा चालू किया जा रहा है।",
            response_speech_mr="ई-कचऱ्याचा फोटो काढण्यासाठी कॅमेरा सुरू होत आहे.",
            response_speech_en="Opening camera to photograph e-waste.",
            navigation_route="#camera"
        )
        
    # 3. Find recycler / pickup
    elif any(k in text for k in ["recycler", "paas", "pickup", "gadi", "near", "रिसाइक्लर", "जवळ", "पिकअप"]):
        return VoiceIntentResponse(
            intent="FIND_RECYCLER",
            response_speech_hi="आपके पास के सत्यापित रिसाइक्लर ढूंढे जा रहे हैं।",
            response_speech_mr="आपल्या जवळचे अधिकृत रिसायकलर शोधत आहे.",
            response_speech_en="Finding nearby authorized recyclers with pickup.",
            navigation_route="#recyclers"
        )
        
    # 4. Earnings / Ledger
    elif any(k in text for k in ["kamai", "paisa", "paise", "ledger", "hisab", "khata", "पैसे", "कमाई", "हिशोब", "खाते"]):
        return VoiceIntentResponse(
            intent="MY_EARNINGS",
            response_speech_hi="आपकी कमाई का बहीखाता खोला जा रहा है।",
            response_speech_mr="आपल्या कमाईचे खाते उघडत आहे.",
            response_speech_en="Opening your earnings ledger.",
            navigation_route="#ledger"
        )
        
    # 5. Safety
    elif any(k in text for k in ["safety", "suraksha", "khatra", "jalana", "dhoka", "सुरक्षा", "धोका", "खतरा"]):
        return VoiceIntentResponse(
            intent="SAFETY_HELP",
            response_speech_hi="ई-कचरा सुरक्षित रखने के नियम और निर्देश।",
            response_speech_mr="ई-कचरा सुरक्षित हाताळणीचे नियम.",
            response_speech_en="Showing safe handling guidance.",
            navigation_route="#safety"
        )
        
    # Default fallback
    return VoiceIntentResponse(
        intent="UNKNOWN",
        response_speech_hi="कृपया फोटो खींचे, भाव देखें, या रिसाइक्लर चुनें।",
        response_speech_mr="कृपया फोटो काढा, भाव पहा किंवा रिसायकलर निवडा.",
        response_speech_en="Please choose an option from the screen.",
        navigation_route="#home"
    )
