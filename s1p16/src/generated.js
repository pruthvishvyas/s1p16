// Generated from frontend_contract.json - do not edit by hand
export const CONTRACT = {
  "generated_at": "2026-10-15T10:59:56",
  "pipeline_version": "2.0",
  "project": {
    "name": "Freight Operations",
    "domain": "logistics_freight",
    "client_id": "s1p16",
    "description": "Freight operator: shipment-level revenue, cost, delivery and cash-collection analytics"
  },
  "terminology": {
    "revenue": "Freight Revenue",
    "customer": "Shipper",
    "product": "Lane",
    "transaction": "Shipment"
  },
  "source": {
    "type": "csv",
    "file": "data/processed/s1p16/enriched_data.csv"
  },
  "outcomes": {
    "understand": {
      "kpis": "understand/kpis.json",
      "charts": "understand/charts/",
      "segments": "understand/segments.json",
      "anomalies": "understand/anomalies.json"
    },
    "decide": {
      "insights": "decide/insights.json",
      "recommendations": "decide/recommendations.json",
      "simulations": "decide/simulations/",
      "goals": "decide/goals.json"
    },
    "monitor": {
      "forecast": "monitor/forecast.json",
      "goal_progress": "monitor/goal_progress.json",
      "alerts": "monitor/alerts.json"
    }
  },
  "model": {
    "type": "RandomForest",
    "mode": "ml",
    "pkl_file": "models/s1p16/best_classifier.pkl",
    "feature_cols_file": "models/s1p16/feature_cols.pkl",
    "input_fields": [
      {
        "name": "Distance_km",
        "type": "float",
        "range": [
          442.0,
          5364.0
        ]
      },
      {
        "name": "Weight_kg",
        "type": "float",
        "range": [
          81.0,
          25966.0
        ]
      },
      {
        "name": "Volume_cbm",
        "type": "float",
        "range": [
          0.3,
          145.0
        ]
      },
      {
        "name": "Load_Factor_pct",
        "type": "float",
        "range": [
          5.4,
          100.0
        ]
      },
      {
        "name": "Empty_Return_km",
        "type": "float",
        "range": [
          0.0,
          1600.0
        ]
      },
      {
        "name": "Planned_Transit_Days",
        "type": "float",
        "range": [
          1.0,
          14.0
        ]
      },
      {
        "name": "planned_km_per_day",
        "type": "float",
        "range": [
          189.6,
          5364.0
        ]
      },
      {
        "name": "weight_per_cbm",
        "type": "float",
        "range": [
          159.7674,
          305.4545
        ]
      },
      {
        "name": "empty_return_ratio",
        "type": "float",
        "range": [
          0.0,
          0.5421
        ]
      },
      {
        "name": "is_subcontracted",
        "type": "float",
        "range": [
          0.0,
          1.0
        ]
      },
      {
        "name": "ship_dow",
        "type": "float",
        "range": [
          0.0,
          6.0
        ]
      },
      {
        "name": "lane_prior_late_rate",
        "type": "float",
        "range": [
          0.0323,
          0.471
        ]
      },
      {
        "name": "customer_prior_late_rate",
        "type": "float",
        "range": [
          0.0284,
          0.5191
        ]
      },
      {
        "name": "Customer_Segment",
        "type": "str",
        "allowed_values": [
          "Automotive",
          "Retail",
          "Pharma",
          "Industrial",
          "Electronics",
          "FMCG"
        ]
      },
      {
        "name": "Origin_Hub",
        "type": "str",
        "allowed_values": [
          "Seattle",
          "Chicago",
          "Memphis",
          "New York",
          "Miami",
          "Dallas",
          "Atlanta",
          "Los Angeles",
          "Denver",
          "Houston"
        ]
      },
      {
        "name": "Destination_Hub",
        "type": "str",
        "allowed_values": [
          "Houston",
          "Atlanta",
          "Dallas",
          "New York",
          "Los Angeles",
          "Memphis",
          "Denver",
          "Chicago",
          "Miami",
          "Seattle"
        ]
      },
      {
        "name": "Service_Mode",
        "type": "str",
        "allowed_values": [
          "Road FTL",
          "Road LTL",
          "Rail Intermodal",
          "Air Freight"
        ]
      },
      {
        "name": "Shipment_Type",
        "type": "str",
        "allowed_values": [
          "Express",
          "Hazmat",
          "Standard",
          "Temperature-Controlled"
        ]
      },
      {
        "name": "Carrier_Type",
        "type": "str",
        "allowed_values": [
          "Subcontracted Trucker",
          "Own Fleet",
          "Rail Operator",
          "Airline"
        ]
      },
      {
        "name": "Rate_Type",
        "type": "str",
        "allowed_values": [
          "Contract",
          "Spot"
        ]
      }
    ],
    "output_label": "late_delivery_probability",
    "threshold": 0.23,
    "output_schema": {
      "prediction": "int",
      "probability": "float",
      "risk_band": "str"
    },
    "horizon": 30,
    "forecast_pkl_file": "models/s1p16/forecast_model.pkl"
  },
  "frontend": {
    "framework": "vanilla HTML/JS",
    "deploy_target": "cloudflare_pages"
  },
  "saas_ready": true
};
export const SIM_FILES = ["empty_return_reduction.json", "late_reduction_impact.json", "price_change_impact.json"];
export const CURRENCY = "USD";
