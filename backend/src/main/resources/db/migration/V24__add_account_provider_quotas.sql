ALTER TABLE user_account
    ADD COLUMN lexiang_ppt_quota INT NOT NULL DEFAULT 100;

ALTER TABLE user_account
    ADD COLUMN workbuddy_video_quota INT NOT NULL DEFAULT 20;

UPDATE user_account
SET quota_remaining = GREATEST(
        quota_remaining,
        CASE role
            WHEN 'STUDENT' THEN 2000
            WHEN 'TEACHER' THEN 5000
            WHEN 'ADMIN' THEN 10000
            ELSE quota_remaining
        END
    ),
    lexiang_ppt_quota = CASE role
        WHEN 'STUDENT' THEN 100
        WHEN 'TEACHER' THEN 200
        WHEN 'ADMIN' THEN 500
        ELSE lexiang_ppt_quota
    END,
    workbuddy_video_quota = CASE role
        WHEN 'STUDENT' THEN 20
        WHEN 'TEACHER' THEN 50
        WHEN 'ADMIN' THEN 100
        ELSE workbuddy_video_quota
    END;
