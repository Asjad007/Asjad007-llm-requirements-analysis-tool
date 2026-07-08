from collections import defaultdict
from app.database import SessionLocal
from app.models import Project,Requirement,AnalysisResult,UserReview

def main():
    db=SessionLocal(); summary=defaultdict(lambda:{'projects':0,'requirements':0,'accepted':0,'modified':0,'rejected':0})
    try:
        for p in db.query(Project).all():
            d=p.domain_system_type or 'Unknown'; summary[d]['projects']+=1
            reqs=db.query(Requirement).filter(Requirement.project_id==p.id).all(); summary[d]['requirements']+=len(reqs)
            for req in reqs:
                for rev in db.query(UserReview).join(AnalysisResult).filter(AnalysisResult.requirement_id==req.id).all():
                    x=rev.decision.lower()
                    if 'accept' in x: summary[d]['accepted']+=1
                    elif 'modify' in x: summary[d]['modified']+=1
                    elif 'reject' in x: summary[d]['rejected']+=1
        print(dict(summary))
    finally: db.close()
if __name__=='__main__': main()
