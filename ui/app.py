"""
MONITOR MVP Dashboard - Streamlit UI
Runs the full pipeline: raw -> preprocess -> infer -> forecast
"""
import streamlit as st
import requests
import json
from datetime import datetime
from typing import Optional, Dict, Any

# Configure Streamlit
st.set_page_config(
    page_title="MONITOR MVP Dashboard",
    page_icon="📊",
    layout="wide"
)

# Constants
API_BASE_URL = "http://localhost:8000"
DEFAULT_EMAIL = "demo@monitor.local"
DEFAULT_PASSWORD = "password123"

# Session state initialization
if "token" not in st.session_state:
    st.session_state.token = None
if "user_id" not in st.session_state:
    st.session_state.user_id = None
if "email" not in st.session_state:
    st.session_state.email = None
if "run_data" not in st.session_state:
    st.session_state.run_data = {}


def make_request(method: str, endpoint: str, json_data: Dict = None, expected_status: list = None) -> Dict[str, Any]:
    """Make HTTP request to API."""
    if expected_status is None:
        expected_status = [200, 201]
    
    headers = {}
    if st.session_state.token:
        headers["Authorization"] = f"Bearer {st.session_state.token}"
    
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        if method == "POST":
            response = requests.post(url, json=json_data, headers=headers, timeout=10)
        elif method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        if response.status_code not in expected_status:
            return {"error": f"HTTP {response.status_code}: {response.text}"}
        
        if response.headers.get("content-type") == "application/pdf":
            return {"pdf": response.content}
        
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def login_or_signup():
    """Handle authentication."""
    st.sidebar.title("🔐 Authentication")
    
    auth_type = st.sidebar.radio("Choose:", ["Login", "Signup"])
    
    with st.sidebar.form("auth_form"):
        email = st.text_input("Email", value=DEFAULT_EMAIL)
        password = st.text_input("Password", type="password", value=DEFAULT_PASSWORD)
        submitted = st.form_submit_button("Submit")
        
        if submitted:
            endpoint = "/auth/signup" if auth_type == "Signup" else "/auth/login"
            payload = {"email": email, "password": password}
            if auth_type == "Signup":
                payload["name"] = st.text_input("Name (optional)", "")
            
            result = make_request("POST", endpoint, payload)
            
            if "error" not in result:
                st.session_state.token = result.get("access_token") or result.get("token")
                st.session_state.user_id = result.get("user_id")
                st.session_state.email = email
                st.success(f"✅ {auth_type} successful!")
                st.rerun()
            else:
                st.error(f"❌ {auth_type} failed: {result['error']}")


def ingest_raw_data():
    """Ingest raw sensor data."""
    st.header("📥 Raw Data Ingestion")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        glucose = st.number_input("Glucose (mg/dL)", value=120.0, step=1.0)
    with col2:
        lactate = st.number_input("Lactate (mmol/L)", value=1.5, step=0.1)
    with col3:
        sensor_3 = st.number_input("Sensor 3", value=0.0, step=0.1)
    
    specimen_type = st.selectbox("Specimen Type", ["blood", "plasma", "serum", "other"])
    
    if st.button("📤 Submit Raw Data"):
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "specimen_type": specimen_type,
            "observed": {
                "glucose_mg_dl": glucose,
                "lactate_mmol_l": lactate,
            },
            "context": {}
        }
        
        result = make_request("POST", "/data/raw", payload)
        
        if "error" not in result:
            raw_id = result.get("id") or result.get("raw_id")
            st.session_state.run_data["raw_id"] = raw_id
            st.success(f"✅ Raw data ingested! ID: {raw_id}")
            
            # Display ingested data
            with st.expander("📋 Raw Data Details"):
                st.json({
                    "id": raw_id,
                    "timestamp": result.get("timestamp"),
                    "glucose": glucose,
                    "lactate": lactate,
                    "specimen_type": specimen_type,
                })
        else:
            st.error(f"❌ Error: {result['error']}")


def preprocess_data():
    """Preprocess raw sensor data."""
    st.header("⚙️ Preprocessing / Calibration")
    
    if "raw_id" not in st.session_state.run_data:
        st.warning("⚠️ Please ingest raw data first.")
        return
    
    raw_id = st.session_state.run_data["raw_id"]
    
    if st.button("🔄 Run Preprocessing"):
        payload = {"raw_id": raw_id}
        result = make_request("POST", "/data/preprocess", payload)
        
        if "error" not in result:
            calibrated_id = result.get("id") or result.get("calibrated_id")
            st.session_state.run_data["calibrated_id"] = calibrated_id
            st.success(f"✅ Preprocessing complete! Calibrated ID: {calibrated_id}")
            
            with st.expander("📊 Preprocessing Results"):
                st.json({
                    "calibrated_id": calibrated_id,
                    "calibrated_metric": result.get("calibrated_metric"),
                    "features": result.get("features"),
                    "created_at": result.get("created_at"),
                })
        else:
            st.error(f"❌ Error: {result['error']}")


def run_inference():
    """Run inference on calibrated features."""
    st.header("🧠 Inference")
    
    if "calibrated_id" not in st.session_state.run_data:
        st.warning("⚠️ Please preprocess data first.")
        return
    
    calibrated_id = st.session_state.run_data["calibrated_id"]
    
    if st.button("🔮 Run Inference"):
        payload = {"calibrated_id": calibrated_id}
        result = make_request("POST", "/ai/infer", payload)
        
        if "error" not in result:
            st.session_state.run_data["inference"] = result
            st.success("✅ Inference complete!")
            
            with st.expander("📈 Inference Results"):
                # Display inferred values
                st.subheader("Inferred Values")
                for item in result.get("inferred", []):
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric(item["name"], f"{item['value']:.4f}", delta=None)
                    with col2:
                        st.metric("Confidence", f"{item['confidence']:.2%}")
                    with col3:
                        st.metric("Method", item["method"])
                
                # Assumptions and limitations
                st.subheader("Model Information")
                col1, col2 = st.columns(2)
                with col1:
                    st.write("**Assumptions:**")
                    for assumption in result.get("assumptions", []):
                        st.write(f"• {assumption}")
                
                with col2:
                    st.write("**Limitations:**")
                    for limitation in result.get("limitations", []):
                        st.write(f"• {limitation}")
                
                st.write("**Disclaimer:**", result.get("disclaimer", ""))
        else:
            st.error(f"❌ Error: {result['error']}")


def run_forecast():
    """Run forecast on calibrated features."""
    st.header("📊 Forecast")
    
    if "calibrated_id" not in st.session_state.run_data:
        st.warning("⚠️ Please preprocess data first.")
        return
    
    calibrated_id = st.session_state.run_data["calibrated_id"]
    horizon_steps = st.slider("Forecast Horizon (steps)", 1, 10, 3)
    
    if st.button("📈 Run Forecast"):
        payload = {
            "calibrated_id": calibrated_id,
            "horizon_steps": horizon_steps
        }
        result = make_request("POST", "/ai/forecast", payload)
        
        if "error" not in result:
            st.session_state.run_data["forecast"] = result
            st.success("✅ Forecast complete!")
            
            with st.expander("📊 Forecast Results"):
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("Step 1 Forecast", f"{result.get('forecast', 0):.4f}")
                with col2:
                    st.metric("Confidence", f"{result.get('confidence', 0):.2%}")
                
                # Forecasts array
                st.write("**Forecast Values:**")
                forecasts = result.get("forecasts", [])
                for i, f in enumerate(forecasts, 1):
                    st.write(f"Step {i}: {f:.4f}")
        else:
            st.error(f"❌ Error: {result['error']}")


def export_pdf():
    """Export PDF report."""
    st.header("📄 PDF Report")
    
    if not st.session_state.run_data:
        st.warning("⚠️ No run data available. Please complete the pipeline first.")
        return
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📥 Download PDF Report"):
            calibrated_id = st.session_state.run_data.get("calibrated_id")
            raw_id = st.session_state.run_data.get("raw_id")
            
            if not calibrated_id and not raw_id:
                st.error("❌ No data available for PDF generation.")
                return
            
            payload = {}
            if calibrated_id:
                payload["calibrated_id"] = calibrated_id
            if raw_id:
                payload["raw_id"] = raw_id
            
            result = make_request("POST", "/reports/pdf", payload)
            
            if "error" not in result and "pdf" in result:
                st.download_button(
                    label="📥 Download PDF",
                    data=result["pdf"],
                    file_name=f"monitor_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf",
                    mime="application/pdf"
                )
            else:
                st.error(f"❌ PDF generation failed: {result.get('error', 'Unknown error')}")
    
    with col2:
        if st.button("🔄 Clear Run Data"):
            st.session_state.run_data = {}
            st.success("✅ Run data cleared.")
            st.rerun()


def main():
    """Main Streamlit app."""
    st.title("📊 MONITOR MVP Dashboard")
    st.write("Integrated pipeline: Raw Data → Preprocess → Inference → Forecast → Report")
    
    # Check authentication
    if not st.session_state.token:
        login_or_signup()
        return
    
    # Display user info
    st.sidebar.success(f"✅ Logged in as: {st.session_state.email}")
    if st.sidebar.button("🚪 Logout"):
        st.session_state.token = None
        st.session_state.user_id = None
        st.session_state.email = None
        st.session_state.run_data = {}
        st.rerun()
    
    # Display API status
    health_result = make_request("GET", "/health", expected_status=[200, 201])
    if "error" not in health_result:
        st.sidebar.success("✅ API Connected")
    else:
        st.sidebar.error(f"❌ API Error: {health_result['error']}")
        st.error("Cannot connect to API. Ensure it's running on http://localhost:8000")
        return
    
    # Main pipeline tabs
    tab1, tab2, tab3, tab4, tab5 = st.tabs(["Raw Data", "Preprocess", "Inference", "Forecast", "Report"])
    
    with tab1:
        ingest_raw_data()
    
    with tab2:
        preprocess_data()
    
    with tab3:
        run_inference()
    
    with tab4:
        run_forecast()
    
    with tab5:
        export_pdf()
    
    # Sidebar: Run summary
    st.sidebar.header("📋 Run Summary")
    if st.session_state.run_data:
        st.sidebar.write(f"• Raw ID: {st.session_state.run_data.get('raw_id', 'N/A')}")
        st.sidebar.write(f"• Calibrated ID: {st.session_state.run_data.get('calibrated_id', 'N/A')}")
        st.sidebar.write(f"• Inference: {'✅' if 'inference' in st.session_state.run_data else '❌'}")
        st.sidebar.write(f"• Forecast: {'✅' if 'forecast' in st.session_state.run_data else '❌'}")
    else:
        st.sidebar.write("No run data yet.")


if __name__ == "__main__":
    main()
