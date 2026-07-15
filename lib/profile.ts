export const candidateProfile = {
  name: "Mario Casanova",
  location: "México",
  allowedLocations: ["mexico", "méxico", "mx", "latam", "latin america", "worldwide", "anywhere", "global"],
  hardExclusions: ["full-time employee", "full time employee", "w-2", "w2", "permanent employee", "employer of record", "eor", "hybrid", "on-site", "onsite"],
  strengths: [
    "python", "sql", "machine learning", "statistical modeling", "predictive modeling", "llm", "rag",
    "data pipelines", "etl", "elt", "dbt", "spark", "pyspark", "gcp", "azure", "databricks",
    "power bi", "tableau", "looker", "data quality", "forecasting", "a/b testing", "cohort analysis",
    "api", "c#", "copilot", "multi-agent", "nlp", "sentiment analysis", "financial data", "stakeholder",
  ],
  adjacent: ["aws", "airflow", "bigquery", "clickhouse", "kubernetes", "snowflake", "terraform", "docker", "typescript"],
  tracks: {
    SDS: ["data scientist", "machine learning", "ml engineer", "applied ai", "llm", "rag", "nlp", "statistical", "research"],
    SDE: ["data engineer", "analytics engineer", "data architect", "etl", "elt", "pipeline", "dbt", "spark", "warehouse"],
    SDA: ["data analyst", "product analyst", "business intelligence", "bi analyst", "analytics", "dashboard", "power bi", "tableau"],
    SBA: ["business analyst", "business consultant", "strategy", "operations", "stakeholder", "requirements", "financial analyst"],
  },
  energizers: ["build", "design", "research", "automation", "architecture", "model", "experiment", "strategy", "ownership", "autonomy"],
  drainers: ["maintenance only", "repetitive data entry", "support rotation", "on-call only"],
} as const;

export const cvProfiles = [
  { short: "SDS", name: "Senior Data Scientist", focus: "ML, estadística, LLMs", updated: "Jul 2026" },
  { short: "SDE", name: "Senior Data Engineer", focus: "Pipelines, cloud, dbt", updated: "Jul 2026" },
  { short: "SDA", name: "Senior Data Analyst", focus: "BI, SQL, analítica", updated: "Jul 2026" },
  { short: "SBA", name: "Senior Business Analyst", focus: "Estrategia, KPIs, negocio", updated: "Jul 2026" },
] as const;
