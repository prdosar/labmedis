namespace LabMedis.Domain.Common;

public abstract class BaseEntity
{
    public long Id { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public bool IsDeleted { get; private set; }

    public void MarkCreated(DateTime timestamp)
    {
        CreatedAt = timestamp;
        UpdatedAt = null;
        IsDeleted = false;
    }

    public void MarkUpdated(DateTime timestamp)
    {
        UpdatedAt = timestamp;
    }

    public void SoftDelete(DateTime timestamp)
    {
        IsDeleted = true;
        UpdatedAt = timestamp;
    }

    public void Restore(DateTime timestamp)
    {
        IsDeleted = false;
        UpdatedAt = timestamp;
    }
}
