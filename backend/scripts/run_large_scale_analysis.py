from app.database import SessionLocal
from app.models import Requirement, AnalysisResult
from app.services.llm_service import generate_analysis


def safe_text(value):

    if value is None:
        return ""

    if isinstance(value, list):
        return "\n".join(
            str(item)
            for item in value
        )

    if isinstance(value, dict):
        return "\n".join(
            f"{key}: {val}"
            for key, val in value.items()
        )

    return str(value)


def main():

    db = SessionLocal()

    created = 0
    skipped = 0
    failed = 0

    try:

        requirements = (
            db.query(Requirement)
            .order_by(Requirement.id)
            .all()
        )

        total = len(requirements)

        print("==============================")
        print("Large Scale Requirement Analysis")
        print("==============================")
        print("Total requirements:", total)
        print()


        for index, req in enumerate(requirements, start=1):

            existing = (
                db.query(AnalysisResult)
                .filter(
                    AnalysisResult.requirement_id == req.id
                )
                .first()
            )


            if existing:

                skipped += 1

                continue


            try:

                print(
                    f"Analysing {index}/{total} | Requirement ID: {req.id}"
                )


                result = generate_analysis(
                    req.requirement_text
                )


                analysis = AnalysisResult(

                    requirement_id=req.id,


                    requirement_type=safe_text(
                        result.get(
                            "requirement_type",
                            "Unclear"
                        )
                    ),


                    ambiguity_status=safe_text(
                        result.get(
                            "ambiguity_status",
                            "Unknown"
                        )
                    ),


                    ambiguity_explanation=safe_text(
                        result.get(
                            "ambiguity_explanation"
                        )
                    ),


                    priority_level=safe_text(
                        result.get(
                            "priority_level",
                            "Medium"
                        )
                    ),


                    priority_reason=safe_text(
                        result.get(
                            "priority_reason"
                        )
                    ),


                    acceptance_criteria=safe_text(
                        result.get(
                            "acceptance_criteria"
                        )
                    ),


                    test_case=safe_text(
                        result.get(
                            "test_case"
                        )
                    ),


                    improvement_suggestion=safe_text(
                        result.get(
                            "improvement_suggestion"
                        )
                    ),


                    confidence_score=float(
                        result.get(
                            "confidence_score",
                            0.5
                        )
                    ),


                    analysis_method=safe_text(
                        result.get(
                            "analysis_method"
                        )
                    ),


                    literature_basis=safe_text(
                        result.get(
                            "literature_basis"
                        )
                    ),

                )


                db.add(analysis)

                created += 1


                # Save every 5 records
                if created % 5 == 0:

                    db.commit()

                    print(
                        f"Saved {created} analysis records"
                    )


            except Exception as error:

                db.rollback()

                failed += 1

                print(
                    "FAILED Requirement:",
                    req.id
                )

                print(
                    error
                )



        db.commit()


        print()
        print("==============================")
        print("Analysis Completed")
        print("==============================")
        print(
            "Created:",
            created
        )

        print(
            "Skipped:",
            skipped
        )

        print(
            "Failed:",
            failed
        )

        print("==============================")


    finally:

        db.close()



if __name__ == "__main__":

    main()