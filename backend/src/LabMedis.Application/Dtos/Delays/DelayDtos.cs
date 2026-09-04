namespace LabMedis.Application.Dtos.Delays;

public record DelayDto(long Id, string Label, int SortOrder, bool IsActive);

public record DelayCreateDto(string Label, int SortOrder = 0, bool IsActive = true);

public record DelayUpdateDto(string Label, int SortOrder, bool IsActive);
