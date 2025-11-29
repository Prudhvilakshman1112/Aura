-- Populate daily_solved_questions table with today's data from existing daily_coding_tracker
INSERT INTO daily_solved_questions (
    user_id, date,
    leetcode_solved_today, codechef_solved_today, codeforces_solved_today, total_solved_today,
    leetcode_start_total, codechef_start_total, codeforces_start_total,
    leetcode_current_total, codechef_current_total, codeforces_current_total,
    created_at, updated_at
)
SELECT 
    user_id, 
    tracking_date as date,
    daily_leetcode_solved as leetcode_solved_today,
    daily_codechef_solved as codechef_solved_today, 
    daily_codeforces_solved as codeforces_solved_today,
    total_daily_solved as total_solved_today,
    prev_leetcode_total as leetcode_start_total,
    prev_codechef_total as codechef_start_total,
    prev_codeforces_total as codeforces_start_total,
    current_leetcode_total as leetcode_current_total,
    current_codechef_total as codechef_current_total,
    current_codeforces_total as codeforces_current_total,
    created_at,
    updated_at
FROM daily_coding_tracker 
WHERE tracking_date = CURRENT_DATE
ON CONFLICT (user_id, date) DO UPDATE SET
    leetcode_solved_today = EXCLUDED.leetcode_solved_today,
    codechef_solved_today = EXCLUDED.codechef_solved_today,
    codeforces_solved_today = EXCLUDED.codeforces_solved_today,
    total_solved_today = EXCLUDED.total_solved_today,
    leetcode_start_total = EXCLUDED.leetcode_start_total,
    codechef_start_total = EXCLUDED.codechef_start_total,
    codeforces_start_total = EXCLUDED.codeforces_start_total,
    leetcode_current_total = EXCLUDED.leetcode_current_total,
    codechef_current_total = EXCLUDED.codechef_current_total,
    codeforces_current_total = EXCLUDED.codeforces_current_total,
    updated_at = EXCLUDED.updated_at;
