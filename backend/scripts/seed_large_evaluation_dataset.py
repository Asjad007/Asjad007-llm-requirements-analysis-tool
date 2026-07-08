from app.database import SessionLocal
from app.models import Project, Requirement

DOMAINS={
'Library Management':['Library Management System','Digital Library Platform','University Library Portal','Book Reservation System','Library Administration System'],
'E-commerce':['Online Shopping System','Marketplace Platform','Order Management System','Payment Processing System','Customer Service Portal'],
'Healthcare':['Hospital Management System','Patient Record System','Medical Appointment System','Prescription Management System','Healthcare Portal'],
'Security':['Authentication System','Access Control Platform','Identity Management System','Security Monitoring System','Audit Logging System'],
'Fleet Management':['Vehicle Tracking System','Transport Management System','Fleet Monitoring System','Driver Management System','Maintenance Management System']}

REQS=[
'The system shall allow users to login using email and password.',
'The system shall allow users to search records using keywords.',
'The system shall generate reports for authorised users.',
'The system shall store information securely in the database.',
'The system shall allow administrators to manage user roles.',
'The system shall send notifications when important events occur.',
'The system shall maintain a history of previous activities.',
'The system shall validate user input before saving information.',
'The system shall allow users to update existing information.',
'The system should respond quickly during normal operation.'
]

def main():
    db=SessionLocal(); p_count=0; r_count=0
    try:
        for domain,names in DOMAINS.items():
            for name in names:
                p=Project(name=name,description=f'Evaluation project for {domain} domain.',domain_system_type=domain)
                db.add(p); db.commit(); db.refresh(p); p_count+=1
                for text in REQS:
                    db.add(Requirement(project_id=p.id, requirement_text=text, source_type='evaluation_seed'))
                    r_count+=1
                db.commit()
        print('Projects:',p_count,'Requirements:',r_count)
    finally: db.close()
if __name__=='__main__': main()
