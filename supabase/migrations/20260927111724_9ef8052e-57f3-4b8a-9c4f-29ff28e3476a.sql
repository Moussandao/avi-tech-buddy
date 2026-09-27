ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS current_count integer NOT NULL DEFAULT 0;
UPDATE public.batches b SET current_count = GREATEST(0, b.initial_count - COALESCE((SELECT sum(quantity) FROM public.batch_events e WHERE e.batch_id=b.id AND e.event_type='mortality'),0))::int;

CREATE OR REPLACE FUNCTION public.refresh_batch_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bid uuid;
BEGIN
  IF TG_TABLE_NAME = 'batches' THEN
    NEW.current_count := GREATEST(0, NEW.initial_count - COALESCE((SELECT sum(quantity) FROM public.batch_events WHERE batch_id=NEW.id AND event_type='mortality'),0))::int;
    RETURN NEW;
  END IF;
  bid := COALESCE(NEW.batch_id, OLD.batch_id);
  UPDATE public.batches b SET current_count = GREATEST(0, b.initial_count - COALESCE((SELECT sum(quantity) FROM public.batch_events WHERE batch_id=bid AND event_type='mortality'),0))::int WHERE b.id=bid;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_batch_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER batches_count BEFORE INSERT OR UPDATE OF initial_count ON public.batches FOR EACH ROW EXECUTE FUNCTION public.refresh_batch_count();
CREATE TRIGGER batch_events_count AFTER INSERT OR UPDATE OR DELETE ON public.batch_events FOR EACH ROW EXECUTE FUNCTION public.refresh_batch_count();

ALTER TABLE public.readings ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;

ALTER TABLE public.diagnoses DROP CONSTRAINT IF EXISTS diagnoses_severity_check;
ALTER TABLE public.diagnoses ADD CONSTRAINT diagnoses_severity_check CHECK (severity IN ('low','medium','high','critical'));
ALTER TABLE public.diagnoses ADD COLUMN IF NOT EXISTS audio_url text;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS voice_note_url text;

CREATE POLICY "own health images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='poultry-health-images' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "own health images write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='poultry-health-images' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "own health images delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='poultry-health-images' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "own voice notes read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='poultry-voice-notes' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "own voice notes write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='poultry-voice-notes' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "own voice notes delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='poultry-voice-notes' AND (storage.foldername(name))[1]=auth.uid()::text);