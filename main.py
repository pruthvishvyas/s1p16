import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config.config import CONFIG
from src.utils import ensure_dirs, write_config_files
from src.data.ingest import load_and_validate
from src.data.clean import clean
from src.features.engineer import engineer
from src.analytics.eda import run_eda
from src.models.classify import run_classification
from src.models.segment import run_segmentation
from src.models.forecast import run_forecast
from src.analytics.business import run_business_logic
from src.analytics.simulate import run_simulations
from src.analytics.goals import run_goals
from src.analytics.insights import run_insights
from src.reporting.export import export


def _keep(df, _result):
    return df


def main():
    ensure_dirs(CONFIG)
    write_config_files(CONFIG)
    phases = [
        ('Ingestion', lambda df: load_and_validate(CONFIG), True),
        ('Cleaning', lambda df: clean(df, CONFIG), True),
        ('Engineering', lambda df: engineer(df, CONFIG), True),
        ('EDA', lambda df: _keep(df, run_eda(df, CONFIG)), False),
        ('Classify', lambda df: run_classification(df, CONFIG), False),
        ('Segment', lambda df: run_segmentation(df, CONFIG), False),
        ('Forecast', lambda df: _keep(df, run_forecast(df, CONFIG)), False),
        ('Business', lambda df: run_business_logic(df, CONFIG), False),
        ('Simulate', lambda df: _keep(df, run_simulations(df, CONFIG)), False),
        ('Goals', lambda df: _keep(df, run_goals(df, CONFIG)), False),
        ('Insights', lambda df: _keep(df, run_insights(df, CONFIG)), False),
        ('Export', lambda df: _keep(df, export(df, CONFIG)), False),
    ]
    df = None
    for name, fn, critical in phases:
        try:
            print('Phase:', name)
            result = fn(df)
            if result is not None and hasattr(result, 'shape'):
                df = result
        except Exception as e:
            print('Phase ' + name + ' FAILED:', e)
            if critical:
                sys.exit(1)
    print('Pipeline complete. Next: python export_for_frontend.py')


if __name__ == '__main__':
    main()
