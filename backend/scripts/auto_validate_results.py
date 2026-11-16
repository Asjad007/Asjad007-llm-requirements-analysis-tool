from app.database import SessionLocal
from app.models import AnalysisResult, UserReview

def decide(r):
    c=r.confidence_score or 0.5
    a=(r.ambiguity_status or '').lower()
    if c>=0.85 and 'ambiguous' not in a: return 'ACCEPTED'
    if 'ambiguous' in a: return 'MODIFIED'
    return 'REJECTED'

def main():
    db=SessionLocal(); count=0
    try:
        for r in db.query(AnalysisResult).all():
            if db.query(UserReview).filter(UserReview.analysis_result_id==r.id).first(): continue
            db.add(UserReview(requirement_id=r.requirement_id,analysis_result_id=r.id,decision=decide(r),reviewer_notes='Automated evaluation simulation.'))
            count+=1
        db.commit(); print('Validation records:',count)
    finally: db.close()
if __name__=='__main__': main()
