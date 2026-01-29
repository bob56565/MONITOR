#!/usr/bin/env python3
"""Test script to reproduce Part B error"""
import sys
import traceback
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.part_b.orchestrator import PartBOrchestrator
from app.part_b.schemas.output_schemas import PartBGenerationRequest

def test_partb():
    db = SessionLocal()
    try:
        # Get the most recent submission
        from app.models.part_a_models import PartASubmission
        submission = db.query(PartASubmission).order_by(PartASubmission.id.desc()).first()
        
        if not submission:
            print("No submissions found in database")
            return
        
        print(f"Testing with submission_id={submission.submission_id}, user_id={submission.user_id}")
        
        request = PartBGenerationRequest(
            submission_id=str(submission.submission_id),
            time_window_days=90,
            include_panels=None,
            output_frequency_filter=None
        )
        
        print("Calling PartBOrchestrator.generate_report...")
        response = PartBOrchestrator.generate_report(
            db=db,
            user_id=submission.user_id,
            request=request
        )
        
        print(f"\nStatus: {response.status}")
        if response.errors:
            print(f"Errors: {response.errors}")
        if response.warnings:
            print(f"Warnings: {response.warnings}")
        if response.report:
            print(f"Report generated successfully!")
            print(f"Total outputs: {response.report.total_outputs}")
            print(f"Successful: {response.report.successful_outputs}")
        
    except Exception as e:
        print(f"\n❌ EXCEPTION CAUGHT:")
        print(f"Error: {e}")
        print(f"\nFull traceback:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_partb()
