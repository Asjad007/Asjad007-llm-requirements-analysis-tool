"""
Analyse all seeded requirements using the existing LLM analysis service.

Run:

PYTHONPATH=. python scripts/analyse_seeded_requirements.py

"""

from app.database import SessionLocal
from app.models import Requirement, AnalysisResult
from app.services.llm_service import analyse_requirement


def main():

    db = SessionLocal()

    try:

        requirements = db.query(Requirement).all()

        print("--------------------------------")
        print("Total requirements found:", len(requirements))
        print("--------------------------------")


        created = 0
        skipped = 0


        for index, requirement in enumerate(requirements, start=1):

            # avoid duplicate analysis
            existing = (
                db.query(AnalysisResult)
                .filter(
                    AnalysisResult.requirement_id == requirement.id
                )
                .first()
            )


            if existing:
                skipped += 1
                continue


            print(
                f"[{index}/{len(requirements)}] Analysing requirement {requirement.id}"
            )


            try:

                result = analyse_requirement(
                    requirement.original_text
                )


                analysis = AnalysisResult(

                    requirement_id=requirement.id,

                    requirement_type=result.get(
                        "requirement_type",
                        "Unclear"
                    ),

                    ambiguity_status=result.get(
                        "ambiguity_status",
                        "Unknown"
                    ),

                    ambiguity_explanation=result.get(
                        "ambiguity_explanation",
                        ""
                    ),

                    priority_level=result.get(
                        "priority_level",
                        "Medium"
                    ),

                    priority_reason=result.get(
                        "priority_reason",
                        ""
                    ),

                    acceptance_criteria=result.get(
                        "acceptance_criteria",
                        ""
                    ),

                    test_case=result.get(
                        "test_case",
                        ""
                    ),

                    improvement_suggestion=result.get(
                        "improvement_suggestion",
                        ""
                    ),

                    confidence_score=result.get(
                        "confidence_score",
                        0.5
                    ),

                    analysis_method=result.get(
                        "analysis_method",
                        "LLM requirements analysis"
                    ),

                    literature_basis=result.get(
                        "literature_basis",
                        "LLM-for-Requirements-Engineering literature"
                    )

                )


                db.add(analysis)

                db.commit()

                created += 1


            except Exception as error:

                print(
                    "FAILED requirement:",
                    requirement.id
                )

                print(error)

                db.rollback()



        print("--------------------------------")
        print("Completed")
        print("New analyses created:", created)
        print("Skipped existing:", skipped)
        print("--------------------------------")


    finally:

        db.close()



if __name__ == "__main__":

    main()