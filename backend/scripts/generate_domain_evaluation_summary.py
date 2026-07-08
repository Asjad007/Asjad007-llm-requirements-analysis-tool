from collections import defaultdict

from app.database import SessionLocal
from app.models import (
    Project,
    Requirement,
    AnalysisResult,
    UserReview,
)


def main():

    db = SessionLocal()

    summary = defaultdict(
        lambda: {
            "projects": 0,
            "requirements": 0,
            "accepted": 0,
            "modified": 0,
            "rejected": 0,
        }
    )

    try:

        projects = db.query(Project).all()


        for project in projects:

            domain = (
                project.domain_system_type
                or "Unknown"
            )


            summary[domain]["projects"] += 1


            requirements = (
                db.query(Requirement)
                .filter(
                    Requirement.project_id == project.id
                )
                .all()
            )


            summary[domain]["requirements"] += len(requirements)


            for req in requirements:


                reviews = (
                    db.query(UserReview)
                    .join(
                        AnalysisResult,
                        UserReview.analysis_result_id
                        ==
                        AnalysisResult.id
                    )
                    .filter(
                        AnalysisResult.requirement_id
                        ==
                        req.id
                    )
                    .all()
                )


                for review in reviews:

                    decision = (
                        review.decision
                        .lower()
                    )


                    if "accept" in decision:
                        summary[domain]["accepted"] += 1

                    elif "modify" in decision:
                        summary[domain]["modified"] += 1

                    elif "reject" in decision:
                        summary[domain]["rejected"] += 1



        print("\n==============================")
        print("MULTI-DOMAIN EVALUATION SUMMARY")
        print("==============================\n")


        total = {
            "projects":0,
            "requirements":0,
            "accepted":0,
            "modified":0,
            "rejected":0
        }


        for domain, data in summary.items():

            print(domain)
            print("------------------------------")

            for key,value in data.items():
                print(
                    key,
                    ":",
                    value
                )

                total[key] += value

            print()



        print("==============================")
        print("TOTAL")
        print("==============================")

        for key,value in total.items():

            print(
                key,
                ":",
                value
            )


    finally:

        db.close()



if __name__ == "__main__":

    main()